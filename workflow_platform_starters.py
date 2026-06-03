"""
Shared starter runtimes for Backstory workflow platform scripts.

These helpers keep the generated LangGraph, Claude Agent SDK, and OpenAI
Agents SDK workflow scripts consistent across the automation library. They
are intentionally starter-grade implementations: they provide working control
flow, delivery hooks, and best-effort source/MCP enrichment patterns, but
they still expect deployment-specific API endpoints, credentials, routing,
and schema tuning.
"""
from __future__ import annotations

import json
import os
import smtplib
from dataclasses import asdict, dataclass
from datetime import datetime
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, Literal
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class WorkflowSpec:
    workflow_id: str
    name: str
    description: str
    system_prompt: str
    runner_instructions: str
    source_summary: str
    source_env_var: str
    source_path: str
    source_label: str = "records"
    source_method: str = "GET"
    lookback_days: int = 7
    trigger_mode: Literal["schedule", "webhook"] = "schedule"
    delivery_mode: Literal["slack", "email", "slack_or_email"] = "slack_or_email"
    slack_channel_env: str = "WORKFLOW_SLACK_CHANNEL"
    email_recipients_env: str = "WORKFLOW_EMAIL_RECIPIENTS"
    payload_file_env: str = "TRIGGER_PAYLOAD_PATH"
    payload_json_env: str = "TRIGGER_PAYLOAD_JSON"


@dataclass(frozen=True)
class RunContext:
    workflow_id: str
    workflow_name: str
    mode: str
    trigger_type: str
    lookback_days: int
    delivery_mode: str
    dry_run: bool
    run_timestamp_utc: str
    source_summary: str


@dataclass(frozen=True)
class SourceRecord:
    source_system: str
    source_id: str
    source_url: str
    owner: str
    account_name: str
    opportunity_name: str
    workflow_specific_fields: dict[str, Any]
    raw_record: dict[str, Any]


@dataclass(frozen=True)
class EnrichmentContext:
    summary: str
    confidence: str
    source_refs: list[str]
    tool_results: list[str]


@dataclass(frozen=True)
class DeliveryPayload:
    target_type: str
    target_id: str
    format: str
    title: str
    body: str
    blocks_or_html: str
    thread_key: str
    dedupe_key: str


def _workflow_token_env(workflow_id: str) -> str:
    return f"{workflow_id.upper().replace('-', '_')}_SOURCE_API_TOKEN"


def _read_json_file(path: Path) -> Any:
    return json.loads(path.read_text())


def _load_trigger_payload(spec: WorkflowSpec) -> Any:
    if spec.trigger_mode != "webhook":
        return None

    payload_path = os.environ.get(spec.payload_file_env, "").strip()
    if payload_path:
        path = Path(payload_path)
        if path.exists():
            return _read_json_file(path)

    payload_json = os.environ.get(spec.payload_json_env, "").strip()
    if payload_json:
        try:
            return json.loads(payload_json)
        except json.JSONDecodeError:
            return None

    return None


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _normalize_records(payload: Any, preferred_label: str) -> list[dict[str, Any]]:
    if payload is None:
        return []
    if isinstance(payload, list):
        return [item if isinstance(item, dict) else {"value": item} for item in payload]
    if not isinstance(payload, dict):
        return [{"value": payload}]

    preferred_keys = [
        preferred_label,
        "records",
        "items",
        "results",
        "data",
        "accounts",
        "opportunities",
        "meetings",
        "emails",
        "events",
        "deals",
        "territories",
        "reps",
        "mqls",
        "renewals",
    ]
    for key in preferred_keys:
        value = payload.get(key)
        if isinstance(value, list):
            return [item if isinstance(item, dict) else {"value": item} for item in value]
    return [payload]


def _auth_headers(workflow_id: str) -> dict[str, str]:
    token = os.environ.get(_workflow_token_env(workflow_id), os.environ.get("SOURCE_API_TOKEN", "")).strip()
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _canonical_source_system(spec: WorkflowSpec) -> str:
    explicit = os.environ.get("SOURCE_SYSTEM", "").strip()
    if explicit:
        return explicit
    base_env = spec.source_env_var.lower().replace("_api_base_url", "").replace("_base_url", "")
    return base_env or "source-system"


def _first_value(record: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return value
    return None


def _string_value(value: Any) -> str:
    if value in (None, ""):
        return ""
    return str(value)


def normalize_source_record(spec: WorkflowSpec, record: dict[str, Any]) -> dict[str, Any]:
    contract = SourceRecord(
        source_system=_canonical_source_system(spec),
        source_id=_string_value(
            _first_value(
                record,
                "source_id",
                "sourceId",
                "id",
                "accountId",
                "account_id",
                "opportunityId",
                "opportunity_id",
                "dealId",
                "deal_id",
                "crmId",
                "crm_id",
            )
        ),
        source_url=_string_value(_first_value(record, "source_url", "sourceUrl", "url", "link", "href")),
        owner=_string_value(
            _first_value(
                record,
                "owner",
                "accountOwner",
                "account_owner",
                "opportunityOwner",
                "opportunity_owner",
                "repName",
                "rep_name",
                "user",
                "userName",
                "user_name",
            )
        ),
        account_name=_string_value(_first_value(record, "account_name", "accountName", "account", "company")),
        opportunity_name=_string_value(
            _first_value(record, "opportunity_name", "opportunityName", "dealName", "deal_name", "opportunity", "deal")
        ),
        workflow_specific_fields={
            key: value
            for key, value in record.items()
            if key
            not in {
                "source_system",
                "source_id",
                "sourceId",
                "id",
                "source_url",
                "sourceUrl",
                "url",
                "link",
                "href",
                "owner",
                "accountOwner",
                "account_owner",
                "opportunityOwner",
                "opportunity_owner",
                "repName",
                "rep_name",
                "user",
                "userName",
                "user_name",
                "account_name",
                "accountName",
                "account",
                "company",
                "opportunity_name",
                "opportunityName",
                "opportunity",
                "dealName",
                "deal_name",
                "deal",
            }
        },
        raw_record=record,
    )
    return {
        **record,
        "source_system": contract.source_system,
        "source_id": contract.source_id,
        "source_url": contract.source_url,
        "owner": contract.owner,
        "account_name": contract.account_name,
        "opportunity_name": contract.opportunity_name,
        "workflow_specific_fields": contract.workflow_specific_fields,
        "raw_record": contract.raw_record,
    }


def load_source_records(spec: WorkflowSpec) -> list[dict[str, Any]]:
    payload = _load_trigger_payload(spec)
    if payload is not None:
        return [normalize_source_record(spec, item) for item in _normalize_records(payload, spec.source_label)]

    base_url = os.environ.get(spec.source_env_var, "").strip().rstrip("/")
    if not base_url:
        return []

    headers = _auth_headers(spec.workflow_id)
    try:
        if spec.source_method.upper() == "GET":
            query = urlencode({"lookback_days": spec.lookback_days, "workflow_id": spec.workflow_id})
            separator = "&" if "?" in spec.source_path else "?"
            url = f"{base_url}{spec.source_path}{separator}{query}"
            request = Request(url, headers=headers, method="GET")
        else:
            headers["Content-Type"] = "application/json"
            body = json.dumps(
                {
                    "lookback_days": spec.lookback_days,
                    "workflow_id": spec.workflow_id,
                    "source_summary": spec.source_summary,
                }
            ).encode()
            request = Request(f"{base_url}{spec.source_path}", headers=headers, data=body, method=spec.source_method.upper())

        with urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode())
        return [normalize_source_record(spec, item) for item in _normalize_records(payload, spec.source_label)]
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f"[{spec.workflow_id}] Failed to load source records: {exc}")
        return []


def load_adaptation_assets(spec: WorkflowSpec) -> dict[str, Any]:
    payload = _load_trigger_payload(spec)
    payload_data = payload if isinstance(payload, dict) else {}

    customer_config_ref = _string_value(
        _first_value(payload_data, "customerConfigRef", "configRef", "customer_config_ref")
    )
    customer_config = payload_data.get("customerConfig") or payload_data.get("stackConfig") or {}

    config_path = os.environ.get("CUSTOMER_STACK_CONFIG_PATH", "").strip()
    if not customer_config and config_path:
        path = Path(config_path)
        if path.exists():
            try:
                customer_config = _read_json_file(path)
                if not customer_config_ref:
                    customer_config_ref = config_path
            except json.JSONDecodeError:
                customer_config = {}

    config_json = os.environ.get("CUSTOMER_STACK_CONFIG_JSON", "").strip()
    if not customer_config and config_json:
        try:
            customer_config = json.loads(config_json)
            if not customer_config_ref:
                customer_config_ref = "env:CUSTOMER_STACK_CONFIG_JSON"
        except json.JSONDecodeError:
            customer_config = {}

    selected_packs = payload_data.get("selectedPacks")
    if not isinstance(selected_packs, list):
        selected_packs = customer_config.get("selected_packs", []) if isinstance(customer_config, dict) else []
    if not isinstance(selected_packs, list):
        selected_packs = []

    inline_adapter_packs = payload_data.get("adapterPacks") or payload_data.get("adapterPackManifests") or []
    if isinstance(inline_adapter_packs, dict):
        inline_adapter_packs = [inline_adapter_packs]
    if not isinstance(inline_adapter_packs, list):
        inline_adapter_packs = []

    requested_pack_ids: list[str] = []
    for pack in selected_packs:
        if isinstance(pack, str) and pack:
            requested_pack_ids.append(pack)
            continue
        if isinstance(pack, dict):
            pack_id = _string_value(_first_value(pack, "pack_id", "packId"))
            if pack_id:
                requested_pack_ids.append(pack_id)

    payload_pack_ids = payload_data.get("adapterPackIds", [])
    if isinstance(payload_pack_ids, str):
        payload_pack_ids = [item.strip() for item in payload_pack_ids.split(",") if item.strip()]
    if isinstance(payload_pack_ids, list):
        for pack_id in payload_pack_ids:
            if pack_id:
                requested_pack_ids.append(str(pack_id))

    env_pack_ids = [item.strip() for item in os.environ.get("ADAPTER_PACK_IDS", "").split(",") if item.strip()]
    requested_pack_ids.extend(env_pack_ids)

    manifests_by_id: dict[str, dict[str, Any]] = {}
    for manifest in inline_adapter_packs:
        if isinstance(manifest, dict):
            pack_id = _string_value(_first_value(manifest, "pack_id", "packId"))
            if pack_id:
                manifests_by_id[pack_id] = manifest

    asset_root = Path(os.environ.get("ADAPTATION_ASSET_ROOT", "").strip() or Path(__file__).resolve().parent / "adapter-packs")
    unresolved_pack_ids = [pack_id for pack_id in requested_pack_ids if pack_id and pack_id not in manifests_by_id]
    if unresolved_pack_ids and asset_root.exists():
        for manifest_path in asset_root.rglob("manifest.json"):
            try:
                manifest = _read_json_file(manifest_path)
            except json.JSONDecodeError:
                continue
            pack_id = _string_value(_first_value(manifest, "pack_id", "packId"))
            if pack_id and pack_id in unresolved_pack_ids and pack_id not in manifests_by_id:
                manifests_by_id[pack_id] = manifest

    certification = payload_data.get("certification") or (
        customer_config.get("certification", {}) if isinstance(customer_config, dict) else {}
    )
    if not isinstance(certification, dict):
        certification = {}

    normalized_pack_ids = []
    for pack_id in requested_pack_ids:
        if pack_id and pack_id not in normalized_pack_ids:
            normalized_pack_ids.append(pack_id)

    return {
        "customer_config_ref": customer_config_ref,
        "customer_config": customer_config if isinstance(customer_config, dict) else {},
        "selected_packs": selected_packs,
        "selected_pack_ids": normalized_pack_ids,
        "adapter_packs": list(manifests_by_id.values()),
        "certification": certification,
    }


def build_run_context(spec: WorkflowSpec) -> dict[str, Any]:
    mode = os.environ.get("WORKFLOW_MODE", "production").strip() or "production"
    context = RunContext(
        workflow_id=spec.workflow_id,
        workflow_name=spec.name,
        mode=mode,
        trigger_type=spec.trigger_mode,
        lookback_days=spec.lookback_days,
        delivery_mode=spec.delivery_mode,
        dry_run=_env_bool("WORKFLOW_DRY_RUN"),
        run_timestamp_utc=datetime.utcnow().isoformat(),
        source_summary=spec.source_summary,
    )
    data = asdict(context)
    data["trigger_mode"] = data["trigger_type"]
    adaptation_assets = load_adaptation_assets(spec)
    if adaptation_assets.get("customer_config_ref"):
        data["customer_config_ref"] = adaptation_assets["customer_config_ref"]
    if adaptation_assets.get("selected_pack_ids"):
        data["selected_pack_ids"] = adaptation_assets["selected_pack_ids"]
    certification = adaptation_assets.get("certification") or {}
    required_scenarios = certification.get("required_scenarios")
    if isinstance(required_scenarios, list) and required_scenarios:
        data["certification_scenarios"] = required_scenarios
    return data


def record_label(record: dict[str, Any], index: int) -> str:
    candidate_keys = (
        "account_name",
        "opportunity_name",
        "name",
        "accountName",
        "account_name",
        "opportunityName",
        "opportunity_name",
        "subject",
        "email",
        "leadName",
        "lead_name",
        "meetingTitle",
        "title",
        "id",
    )
    for key in candidate_keys:
        value = record.get(key)
        if value:
            return str(value)
    return f"Record {index}"


async def collect_backstory_context_bundle(spec: WorkflowSpec, record: dict[str, Any]) -> dict[str, Any]:
    mcp_url = os.environ.get("BACKSTORY_MCP_URL", "").strip()
    if not mcp_url:
        empty = EnrichmentContext(summary="", confidence="none", source_refs=[], tool_results=[])
        return asdict(empty)

    try:
        from langchain_mcp_adapters.client import MultiServerMCPClient
    except ImportError:
        empty = EnrichmentContext(summary="", confidence="none", source_refs=[], tool_results=[])
        return asdict(empty)

    account_name = _first_value(record, "account_name", "accountName", "account", "company", "name")
    opportunity_name = _first_value(record, "opportunity_name", "opportunityName", "dealName", "deal_name")
    account_id = _first_value(record, "peopleai_account_id", "accountId", "account_id")
    opportunity_id = _first_value(record, "peopleai_opportunity_id", "opportunityId", "opportunity_id", "dealId", "deal_id")

    tool_results: list[str] = []
    source_refs: list[str] = []

    async def maybe_invoke(tool_lookup: dict[str, Any], names: list[str], payloads: list[dict[str, Any]]) -> None:
        for name in names:
            tool = tool_lookup.get(name)
            if tool is None:
                continue
            for payload in payloads:
                if not payload:
                    continue
                try:
                    result = await tool.ainvoke(payload)
                    if result not in (None, "", [], {}):
                        tool_results.append(f"{name}: {result}")
                        source_refs.append(name)
                        return
                except Exception:
                    continue

    question = (
        f"Provide the most relevant Backstory context for the {spec.name} workflow. "
        f"Focus on material engagement, pipeline, risk, and next-step signals."
    )

    try:
        async with MultiServerMCPClient({"backstory": {"url": mcp_url, "transport": "sse"}}) as mcp:
            tools = mcp.get_tools()
            if isinstance(tools, list):
                tool_lookup = {getattr(tool, "name", f"tool_{index}"): tool for index, tool in enumerate(tools)}
            else:
                tool_lookup = dict(tools)

            if account_name or account_id:
                await maybe_invoke(
                    tool_lookup,
                    ["backstory__get_account_status", "get_account_status"],
                    [
                        {"peopleai_account_id": account_id} if account_id else {},
                        {"account_name": account_name} if account_name else {},
                    ],
                )
                await maybe_invoke(
                    tool_lookup,
                    ["backstory__get_recent_account_activity", "get_recent_account_activity"],
                    [
                        {"peopleai_account_id": account_id} if account_id else {},
                        {"account_name": account_name} if account_name else {},
                    ],
                )
                await maybe_invoke(
                    tool_lookup,
                    ["backstory__ask_sales_ai_about_account", "ask_sales_ai_about_account"],
                    [
                        {"peopleai_account_id": account_id, "question": question} if account_id else {},
                        {"account_name": account_name, "question": question} if account_name else {},
                    ],
                )

            if opportunity_name or opportunity_id:
                await maybe_invoke(
                    tool_lookup,
                    ["backstory__get_opportunity_status", "get_opportunity_status"],
                    [
                        {"peopleai_opportunity_id": opportunity_id} if opportunity_id else {},
                        {"opportunity_name": opportunity_name} if opportunity_name else {},
                    ],
                )
                await maybe_invoke(
                    tool_lookup,
                    ["backstory__get_recent_opportunity_activity", "get_recent_opportunity_activity"],
                    [
                        {"peopleai_opportunity_id": opportunity_id} if opportunity_id else {},
                        {"opportunity_name": opportunity_name} if opportunity_name else {},
                    ],
                )
                await maybe_invoke(
                    tool_lookup,
                    ["backstory__ask_sales_ai_about_opportunity", "ask_sales_ai_about_opportunity"],
                    [
                        {"peopleai_opportunity_id": opportunity_id, "question": question} if opportunity_id else {},
                        {"opportunity_name": opportunity_name, "question": question} if opportunity_name else {},
                    ],
                )
    except Exception as exc:
        print(f"[{spec.workflow_id}] MCP context collection failed: {exc}")
        empty = EnrichmentContext(summary="", confidence="low", source_refs=source_refs, tool_results=tool_results)
        return asdict(empty)

    confidence = "high" if tool_results else "none"
    context = EnrichmentContext(
        summary="\n\n".join(tool_results),
        confidence=confidence,
        source_refs=source_refs,
        tool_results=tool_results,
    )
    return asdict(context)


async def collect_backstory_context(spec: WorkflowSpec, record: dict[str, Any]) -> str:
    return str((await collect_backstory_context_bundle(spec, record)).get("summary", ""))


async def post_to_slack(channel_id: str, message: str) -> str:
    from slack_sdk.web.async_client import AsyncWebClient

    client = AsyncWebClient(token=os.environ["SLACK_BOT_TOKEN"])
    result = await client.chat_postMessage(channel=channel_id, text=message, unfurl_links=False)
    return f"Slack: posted to {channel_id} at {result['ts']}"


def send_email(subject: str, body: str, recipients_csv: str) -> str:
    recipients = [item.strip() for item in recipients_csv.split(",") if item.strip()]
    if not recipients:
        return "Email: no recipients configured"

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = os.environ.get("SMTP_USER", "")
    msg["To"] = ", ".join(recipients)

    with smtplib.SMTP(os.environ["SMTP_HOST"], int(os.environ.get("SMTP_PORT", "587"))) as server:
        server.starttls()
        server.login(os.environ["SMTP_USER"], os.environ["SMTP_PASS"])
        server.send_message(msg)

    return f"Email: sent to {len(recipients)} recipient(s)"


def _compiled_report(spec: WorkflowSpec, analyses: list[str]) -> str:
    title = f"{spec.name} — {datetime.utcnow().strftime('%b %d, %Y')}"
    if not analyses:
        return f"{title}\n\nNo source records were returned for {spec.source_summary}."
    return f"{title}\n\n" + "\n\n---\n\n".join(analyses)


def build_delivery_payload(
    spec: WorkflowSpec,
    report: str,
    *,
    target_type: str,
    target_id: str,
    format: str = "markdown",
    thread_key: str = "",
) -> dict[str, Any]:
    title = f"{spec.name} — {datetime.utcnow().strftime('%b %d, %Y')}"
    return asdict(
        DeliveryPayload(
            target_type=target_type,
            target_id=target_id,
            format=format,
            title=title,
            body=report,
            blocks_or_html=report,
            thread_key=thread_key,
            dedupe_key=f"{spec.workflow_id}:{target_type}:{target_id}:{datetime.utcnow().strftime('%Y-%m-%d')}",
        )
    )


async def _deliver_report(spec: WorkflowSpec, report: str) -> list[str]:
    results: list[str] = []
    dry_run = _env_bool("WORKFLOW_DRY_RUN")
    delivery_payloads: list[dict[str, Any]] = []

    if spec.delivery_mode in {"slack", "slack_or_email"}:
        channel = os.environ.get(spec.slack_channel_env, os.environ.get("WORKFLOW_SLACK_CHANNEL", "")).strip()
        if channel:
            payload = build_delivery_payload(spec, report, target_type="channel", target_id=channel)
            delivery_payloads.append(payload)
            try:
                if dry_run:
                    results.append(f"Slack dry-run: {json.dumps(payload)}")
                else:
                    results.append(await post_to_slack(channel, report))
            except Exception as exc:
                results.append(f"Slack error: {exc}")

    if spec.delivery_mode in {"email", "slack_or_email"}:
        recipients = os.environ.get(spec.email_recipients_env, os.environ.get("WORKFLOW_EMAIL_RECIPIENTS", "")).strip()
        if recipients:
            payload = build_delivery_payload(spec, report, target_type="email", target_id=recipients, format="plain_text")
            delivery_payloads.append(payload)
            try:
                if dry_run:
                    results.append(f"Email dry-run: {json.dumps(payload)}")
                else:
                    results.append(send_email(f"{spec.name} — {datetime.utcnow().strftime('%b %d, %Y')}", report, recipients))
            except Exception as exc:
                results.append(f"Email error: {exc}")

    if not results:
        results.append("No delivery destination configured; report printed to stdout only.")

    print(report)
    if delivery_payloads:
        print(json.dumps({"delivery_payloads": delivery_payloads}, indent=2))
    return results


async def run_langgraph_workflow(spec: WorkflowSpec) -> dict[str, Any]:
    from typing import TypedDict

    from langchain_anthropic import ChatAnthropic
    from langchain_core.messages import HumanMessage, SystemMessage
    from langgraph.graph import END, StateGraph

    class WorkflowState(TypedDict):
        records: list[dict[str, Any]]
        analyses: list[str]
        report: str
        delivery_results: list[str]

    async def fetch_records(_: WorkflowState) -> dict[str, Any]:
        return {"records": load_source_records(spec)}

    async def analyze_records(state: WorkflowState) -> dict[str, Any]:
        llm = ChatAnthropic(model=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"), temperature=0)
        analyses: list[str] = []
        adaptation_assets = load_adaptation_assets(spec)

        for index, record in enumerate(state["records"], start=1):
            label = record_label(record, index)
            enrichment_context = await collect_backstory_context_bundle(spec, record)
            response = await llm.ainvoke(
                [
                    SystemMessage(content=spec.system_prompt),
                    HumanMessage(
                        content=(
                            f"Workflow run context:\n{json.dumps(build_run_context(spec), indent=2)}\n\n"
                            f"Source record label: {label}\n\n"
                            f"Source record:\n{json.dumps(record, indent=2, default=str)}\n\n"
                            f"Enrichment context:\n{json.dumps(enrichment_context, indent=2, default=str)}\n\n"
                            f"Adaptation assets:\n{json.dumps(adaptation_assets, indent=2, default=str)}\n\n"
                            "Generate the workflow output for this record."
                        )
                    ),
                ]
            )
            content = response.content if isinstance(response.content, str) else str(response.content)
            analyses.append(f"**{label}**\n{content.strip()}")

        return {"analyses": analyses}

    async def compile_report(state: WorkflowState) -> dict[str, Any]:
        return {"report": _compiled_report(spec, state["analyses"])}

    async def deliver_report(state: WorkflowState) -> dict[str, Any]:
        return {"delivery_results": await _deliver_report(spec, state["report"])}

    graph = StateGraph(WorkflowState)
    graph.add_node("fetch_records", fetch_records)
    graph.add_node("analyze_records", analyze_records)
    graph.add_node("compile_report", compile_report)
    graph.add_node("deliver_report", deliver_report)
    graph.set_entry_point("fetch_records")
    graph.add_edge("fetch_records", "analyze_records")
    graph.add_edge("analyze_records", "compile_report")
    graph.add_edge("compile_report", "deliver_report")
    graph.add_edge("deliver_report", END)

    app = graph.compile()
    return await app.ainvoke({"records": [], "analyses": [], "report": "", "delivery_results": []})


async def run_claude_agent_workflow(spec: WorkflowSpec) -> str:
    import anthropic
    from claude_agent_sdk import Agent, tool

    @tool
    def get_run_context() -> dict[str, Any]:
        """Return workflow metadata and the current run context."""
        return build_run_context(spec)

    @tool
    def load_records() -> list[dict[str, Any]]:
        """Load source records for the workflow from the configured system."""
        return load_source_records(spec)

    @tool
    def get_adaptation_assets() -> dict[str, Any]:
        """Load the typed customer stack config, selected adapter packs, and certification metadata for this workflow run."""
        return load_adaptation_assets(spec)

    @tool
    def get_default_slack_channel() -> str:
        """Return the configured Slack destination for this workflow."""
        return os.environ.get(spec.slack_channel_env, os.environ.get("WORKFLOW_SLACK_CHANNEL", "")).strip()

    @tool
    def get_default_email_recipients() -> str:
        """Return the configured email recipients for this workflow."""
        return os.environ.get(spec.email_recipients_env, os.environ.get("WORKFLOW_EMAIL_RECIPIENTS", "")).strip()

    @tool
    async def post_report_to_slack(message: str, channel_id: str = "") -> str:
        """Post the compiled workflow report to Slack."""
        return await post_to_slack(channel_id or get_default_slack_channel(), message)

    @tool
    def send_report_via_email(subject: str, message: str, recipients_csv: str = "") -> str:
        """Send the compiled workflow report through SMTP."""
        return send_email(subject, message, recipients_csv or get_default_email_recipients())

    mcp_servers = []
    if os.environ.get("BACKSTORY_MCP_URL", "").strip():
        mcp_servers.append({"name": "backstory", "url": os.environ["BACKSTORY_MCP_URL"]})

    agent = Agent(
        client=anthropic.Anthropic(),
        model=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
        system=spec.system_prompt,
        tools=[
            get_run_context,
            load_records,
            get_adaptation_assets,
            get_default_slack_channel,
            get_default_email_recipients,
            post_report_to_slack,
            send_report_via_email,
        ],
        mcp_servers=mcp_servers,
    )

    result = await agent.run(spec.runner_instructions)
    print(f"[{datetime.utcnow().isoformat()}] {result}")
    return str(result)


async def run_openai_agent_workflow(spec: WorkflowSpec) -> str:
    from agents import Agent, Runner, function_tool
    from agents.mcp import MCPServerSse

    @function_tool
    def get_run_context() -> dict[str, Any]:
        """Return workflow metadata and the current run context."""
        return build_run_context(spec)

    @function_tool
    def load_records() -> list[dict[str, Any]]:
        """Load source records for the workflow from the configured system."""
        return load_source_records(spec)

    @function_tool
    def get_adaptation_assets() -> dict[str, Any]:
        """Load the typed customer stack config, selected adapter packs, and certification metadata for this workflow run."""
        return load_adaptation_assets(spec)

    @function_tool
    def get_default_slack_channel() -> str:
        """Return the configured Slack destination for this workflow."""
        return os.environ.get(spec.slack_channel_env, os.environ.get("WORKFLOW_SLACK_CHANNEL", "")).strip()

    @function_tool
    def get_default_email_recipients() -> str:
        """Return the configured email recipients for this workflow."""
        return os.environ.get(spec.email_recipients_env, os.environ.get("WORKFLOW_EMAIL_RECIPIENTS", "")).strip()

    @function_tool
    async def post_report_to_slack(message: str, channel_id: str = "") -> str:
        """Post the compiled workflow report to Slack."""
        return await post_to_slack(channel_id or get_default_slack_channel(), message)

    @function_tool
    def send_report_via_email(subject: str, message: str, recipients_csv: str = "") -> str:
        """Send the compiled workflow report through SMTP."""
        return send_email(subject, message, recipients_csv or get_default_email_recipients())

    mcp_servers = []
    if os.environ.get("BACKSTORY_MCP_URL", "").strip():
        mcp_servers.append(MCPServerSse(name="backstory", url=os.environ["BACKSTORY_MCP_URL"]))

    agent = Agent(
        name=spec.name,
        instructions=spec.system_prompt,
        tools=[
            get_run_context,
            load_records,
            get_adaptation_assets,
            get_default_slack_channel,
            get_default_email_recipients,
            post_report_to_slack,
            send_report_via_email,
        ],
        mcp_servers=mcp_servers,
    )

    result = await Runner.run(agent, spec.runner_instructions)
    print(f"[{datetime.utcnow().isoformat()}] {result.final_output}")
    return str(result.final_output)
