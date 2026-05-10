"""
Shared workflow specs for generated Backstory starter scripts.
"""
from __future__ import annotations

from workflow_platform_starters import WorkflowSpec


def _env_prefix(workflow_id: str) -> str:
    return workflow_id.split("-", 1)[1].replace("-", "_").upper()


def _spec(
    workflow_id: str,
    name: str,
    description: str,
    system_prompt: str,
    runner_instructions: str,
    source_summary: str,
    source_env_var: str,
    source_path: str,
    source_label: str,
    *,
    source_method: str = "GET",
    lookback_days: int = 7,
    trigger_mode: str = "schedule",
    delivery_mode: str = "slack_or_email",
) -> WorkflowSpec:
    prefix = _env_prefix(workflow_id)
    return WorkflowSpec(
        workflow_id=workflow_id,
        name=name,
        description=description,
        system_prompt=system_prompt,
        runner_instructions=runner_instructions,
        source_summary=source_summary,
        source_env_var=source_env_var,
        source_path=source_path,
        source_label=source_label,
        source_method=source_method,
        lookback_days=lookback_days,
        trigger_mode=trigger_mode,
        delivery_mode=delivery_mode,
        slack_channel_env=f"{prefix}_SLACK_CHANNEL",
        email_recipients_env=f"{prefix}_EMAIL_RECIPIENTS",
    )


WORKFLOW_SPECS: dict[str, WorkflowSpec] = {
    "06-executive-inbox": _spec(
        "06-executive-inbox",
        "Executive Inbox",
        "Automates executive email triage by identifying customer and prospect messages, enriching them with Backstory context, and routing the highest-priority items to the right internal owners.",
        """You are an executive email triage assistant for revenue teams.

Given an inbound executive email plus Backstory context, classify the message,
explain why it matters, and recommend the best route.

Output format:
- Urgency: Urgent / Follow Up / Informational
- Category: support escalation, deal progression, renewal, executive outreach,
  compliance request, or other
- Account/deal context with names, amounts, stage, renewal timing, or open risks
- Recommended routing destination and next action
- Keep the write-up concise and Slack-friendly
""",
        """Run the Executive Inbox workflow:
1. Call get_run_context() and load_records().
2. For each email record, use Backstory MCP tools to gather the most relevant
   account, opportunity, support, and relationship context.
3. Generate a triage summary using the workflow format.
4. Compile all triaged emails into a single report ordered by urgency.
5. Deliver the report to Slack with post_report_to_slack(). If email
   recipients are configured, also send it via send_report_via_email().
6. If no source records are returned, report that cleanly without error.
""",
        "unread external executive inbox messages",
        "EMAIL_API_BASE_URL",
        "/mail/inbox/unread",
        "emails",
        lookback_days=1,
    ),
    "07-churn-risk-scorecard": _spec(
        "07-churn-risk-scorecard",
        "Churn Risk Scorecard",
        "Generates a weekly churn risk scorecard for customer success leaders by combining account health signals from the CRM with Backstory engagement context.",
        """You are a customer success risk analyst.

For each customer account, assign a churn risk tier and explain the top drivers.

Output format:
- Risk tier: Critical / Watch / Healthy
- Score on a 1-10 scale
- Top risk drivers with evidence
- Save play with a concrete owner action
- Keep the result compact enough for a weekly manager digest
""",
        """Run the Churn Risk Scorecard workflow:
1. Call get_run_context() and load_records().
2. For each account, use Backstory MCP tools to pull engagement, relationship,
   activity, and opportunity context relevant to churn risk.
3. Score the account and write the save play.
4. Compile the accounts into a ranked weekly scorecard grouped by risk tier.
5. Deliver the final report to Slack and optionally email.
""",
        "active customer accounts for weekly churn scoring",
        "CRM_API_BASE_URL",
        "/accounts/active-customers",
        "accounts",
        lookback_days=30,
    ),
    "08-renewal-prep-brief": _spec(
        "08-renewal-prep-brief",
        "Renewal Prep Brief",
        "Builds renewal preparation briefs at key milestones before contract renewal by combining CRM renewal records with Backstory account context.",
        """You are a renewal strategy assistant.

For each upcoming renewal, produce a brief with:
- Account snapshot and renewal timing
- Strengths and momentum signals
- Risk factors that could threaten the renewal
- Expansion opportunities
- Recommended renewal strategy and next actions

Use precise dates, owners, and commercial context when available.
""",
        """Run the Renewal Prep Brief workflow:
1. Call get_run_context() and load_records().
2. For each renewal record, use Backstory MCP tools to gather account health,
   recent activity, open risks, executive engagement, and expansion context.
3. Produce a structured renewal brief.
4. Compile all briefs into a milestone-based report.
5. Deliver the report to Slack and optionally email.
""",
        "accounts approaching renewal milestones",
        "CRM_API_BASE_URL",
        "/renewals/upcoming",
        "renewals",
        lookback_days=60,
    ),
    "09-onboarding-pulse": _spec(
        "09-onboarding-pulse",
        "Onboarding Pulse",
        "Monitors newly closed-won accounts during onboarding to detect customers that are on track, at risk, or going dark before churn risk materializes.",
        """You are an onboarding health assistant.

For each newly won account in the onboarding window, assess whether engagement
is on track, at risk, or going dark.

Output format:
- Status: On Track / At Risk / Going Dark
- Evidence using meetings, emails, stakeholder engagement, and implementation steps
- Why the account matters commercially
- Recommended re-engagement action
""",
        """Run the Onboarding Pulse workflow:
1. Call get_run_context() and load_records().
2. For each onboarding account, use Backstory MCP tools to pull post-sale
   activity, stakeholder engagement, and deal-to-implementation context.
3. Assess the onboarding trajectory and recommend the next action.
4. Compile the output into a pulse report grouped by status.
5. Deliver the report to Slack and optionally email.
""",
        "newly closed-won customers in their first 90 days",
        "CRM_API_BASE_URL",
        "/customers/newly-closed-won",
        "accounts",
        lookback_days=90,
    ),
    "10-activity-gap-detector": _spec(
        "10-activity-gap-detector",
        "Activity Gap Detector",
        "Highlights reps whose weekly activity patterns fall below team benchmarks or who are failing to multi-thread strategically important deals.",
        """You are a frontline sales coaching assistant.

For each rep activity record, compare the rep against team benchmarks and
surface coaching-worthy gaps.

Output format:
- Gap severity: Significant / Moderate / None
- Quantified activity gap versus team or top-performer baseline
- Deal quality risk such as weak multi-threading or missing executive access
- Suggested manager coaching prompt
""",
        """Run the Activity Gap Detector workflow:
1. Call get_run_context() and load_records().
2. For each rep record, use Backstory MCP tools to enrich with recent
   opportunity, relationship, and activity context.
3. Write a coaching insight for the rep.
4. Compile a manager-ready activity gap report.
5. Deliver the report to Slack and optionally email.
""",
        "weekly rep activity benchmark records",
        "CRM_API_BASE_URL",
        "/sales/activity-benchmarks",
        "reps",
        lookback_days=7,
    ),
    "11-deal-hygiene-audit": _spec(
        "11-deal-hygiene-audit",
        "Deal Hygiene Audit",
        "Audits open pipeline for stale close dates, missing next steps, thin stakeholder coverage, and other CRM hygiene issues using Backstory engagement context.",
        """You are a deal hygiene auditor.

For each open opportunity, identify CRM and execution hygiene issues that need
to be fixed this week.

Output format:
- Severity: Critical / Important / Clean
- Specific hygiene issue(s)
- Why the issue matters based on stage, amount, or momentum
- The exact cleanup action the rep should take next
""",
        """Run the Deal Hygiene Audit workflow:
1. Call get_run_context() and load_records().
2. For each opportunity record, use Backstory MCP tools to enrich with recent
   engagement, stakeholder, and timeline context.
3. Evaluate hygiene issues and write a cleanup action list.
4. Compile a rep-ready audit report grouped by severity.
5. Deliver the report to Slack and optionally email.
""",
        "open opportunities for weekly hygiene checks",
        "CRM_API_BASE_URL",
        "/opportunities/open",
        "deals",
        lookback_days=14,
    ),
    "12-win-loss-debrief": _spec(
        "12-win-loss-debrief",
        "Win/Loss Debrief Generator",
        "Generates a structured debrief whenever a deal closes so reps and managers can learn from the full engagement timeline.",
        """You are a win/loss debrief assistant.

For each closed deal, analyze the full deal motion and produce:
- Deal snapshot
- What worked
- What almost derailed the outcome
- Key turning points
- Lessons the broader team should reuse or avoid

Be specific about timeline, stakeholders, and execution patterns.
""",
        """Run the Win/Loss Debrief workflow:
1. Call get_run_context() and load_records().
2. For each closed-deal event, use Backstory MCP tools to gather the full
   engagement timeline and opportunity context.
3. Write the win/loss debrief.
4. Compile the debrief(s) into a final report.
5. Deliver the report to Slack and optionally email.
""",
        "closed opportunity webhook events",
        "CRM_API_BASE_URL",
        "/opportunities/closed-webhook",
        "deals",
        source_method="POST",
        lookback_days=120,
        trigger_mode="webhook",
    ),
    "13-competitive-displacement-alert": _spec(
        "13-competitive-displacement-alert",
        "Competitive Displacement Alert",
        "Flags customer accounts that show both engagement deterioration and competitor activity so account teams can respond before a displacement happens.",
        """You are a competitive risk assistant.

For each at-risk account, determine whether the account shows early, elevated,
or high displacement risk.

Output format:
- Risk level with urgency
- Evidence from engagement decline and competitor signals
- Why the risk matters now
- Defensive action plan for the account team
""",
        """Run the Competitive Displacement Alert workflow:
1. Call get_run_context() and load_records().
2. For each flagged account, use Backstory MCP tools to gather relationship
   changes, activity decline, and account momentum context.
3. Combine that with the source competitor signal record.
4. Produce a defensive alert and group the accounts by risk level.
5. Deliver the alert report to Slack and optionally email.
""",
        "accounts flagged for possible competitive displacement",
        "CRM_API_BASE_URL",
        "/accounts/competitive-risk",
        "accounts",
        source_method="POST",
        lookback_days=14,
    ),
    "14-territory-heat-map": _spec(
        "14-territory-heat-map",
        "Territory Heat Map",
        "Builds a weekly territory digest showing which accounts are heating up, staying steady, or cooling down so reps can focus the week correctly.",
        """You are a territory prioritization assistant.

For each territory account, determine whether momentum is heating up, steady,
or cooling down.

Output format:
- Momentum band
- Evidence behind the change
- Why the account should be prioritized or monitored
- The most useful next action for the rep
""",
        """Run the Territory Heat Map workflow:
1. Call get_run_context() and load_records().
2. For each territory account, use Backstory MCP tools to gather engagement,
   stakeholder, and opportunity context behind the momentum change.
3. Summarize the account's weekly momentum.
4. Compile a heat-map digest grouped by heating up, steady, and cooling down.
5. Deliver the digest to Slack and optionally email.
""",
        "territory momentum records",
        "CRM_API_BASE_URL",
        "/territories/heat-map",
        "accounts",
        lookback_days=7,
    ),
    "15-qbr-auto-prep": _spec(
        "15-qbr-auto-prep",
        "QBR Auto-Prep",
        "Prepares QBR briefing material by combining upcoming QBR meeting records with a quarter of Backstory account engagement and relationship history.",
        """You are a QBR preparation assistant.

For each upcoming QBR, produce:
- Executive summary
- Quarter-over-quarter engagement or business trends
- Key wins
- Risk areas
- Recommended talking points for the account team

Make the output feel ready to paste into a prep channel or doc.
""",
        """Run the QBR Auto-Prep workflow:
1. Call get_run_context() and load_records().
2. For each QBR meeting or account record, use Backstory MCP tools to gather
   quarterly engagement, relationship, opportunity, and risk context.
3. Write the QBR prep brief.
4. Compile the briefs into a final prep report.
5. Deliver the report to Slack and optionally email.
""",
        "upcoming QBR meetings and account mappings",
        "CALENDAR_API_BASE_URL",
        "/qbr-events",
        "meetings",
        lookback_days=90,
    ),
    "16-executive-sponsor-tracker": _spec(
        "16-executive-sponsor-tracker",
        "Executive Sponsor Tracker",
        "Detects strategic deals where VP+ contacts have gone quiet so sellers can re-engage executive sponsors before forecast or renewal risk compounds.",
        """You are an executive sponsor engagement assistant.

For each strategic deal, determine whether executive sponsor engagement is
healthy, declining, or silent.

Output format:
- Sponsor risk level
- Last meaningful executive engagement and why it matters
- The deal or renewal implication
- Specific re-engagement tactic for the owner or leadership team
""",
        """Run the Executive Sponsor Tracker workflow:
1. Call get_run_context() and load_records().
2. For each strategic opportunity record, use Backstory MCP tools to gather
   executive contact engagement and recent deal context.
3. Assess sponsor risk and write a re-engagement recommendation.
4. Compile the alerts into a strategic sponsor report.
5. Deliver the report to Slack and optionally email.
""",
        "strategic deals with executive sponsor metadata",
        "CRM_API_BASE_URL",
        "/opportunities/strategic",
        "deals",
        lookback_days=21,
    ),
    "17-marketing-sales-handoff-scorer": _spec(
        "17-marketing-sales-handoff-scorer",
        "Marketing-to-Sales Handoff Scorer",
        "Scores new MQL handoffs using existing relationship history from Backstory so SDRs and AEs know whether an inbound lead is truly hot, warm, or cold.",
        """You are a marketing-to-sales handoff assistant.

For each new MQL, score the handoff as Hot, Warm, or Cold and explain why.

Output format:
- Handoff score and confidence
- Existing relationship history or lack of it
- Relevant prior opportunities, stakeholders, and buyer signals
- Recommended first outreach approach
""",
        """Run the Marketing-to-Sales Handoff Scorer workflow:
1. Call get_run_context() and load_records().
2. For each MQL event, use Backstory MCP tools to gather prior account
   relationship history, meeting activity, prior opportunities, and current
   buying signals.
3. Score the handoff and write the context brief.
4. Compile the handoff report.
5. Deliver the report to Slack and optionally email.
""",
        "new MQL webhook events",
        "CRM_API_BASE_URL",
        "/mql/handoff",
        "mqls",
        source_method="POST",
        lookback_days=180,
        trigger_mode="webhook",
    ),
    "19-customer-stack-blueprint": _spec(
        "19-customer-stack-blueprint",
        "Customer Stack Blueprint",
        "Turns a customer tool-stack intake into a reusable implementation blueprint that recommends the best validated workflow assets, orchestration recipe, connector substitutions, and rollout path.",
        """You are a workflow solution architect focused on repeatable productization.

Given a customer stack intake, produce an implementation blueprint that:
- identifies the closest validated implementation path
- recommends the best orchestration approach
- maps CRM, delivery, meeting, and storage substitutions
- calls out risks, gaps, and required configuration decisions
- keeps the recommendation reusable across similar customers
""",
        """Run the Customer Stack Blueprint workflow:
1. Call get_run_context() and load_records().
2. For each intake record, identify the workflow goal, the systems in the
   customer's current stack, and the constraints that affect implementation.
3. Recommend the best validated starting point from this library.
4. Produce a blueprint with connector substitutions, build sequencing,
   validation checkpoints, and productization notes.
5. Compile the blueprint(s) into a delivery report for solutions engineering.
6. Deliver the report to Slack and optionally email.
""",
        "customer workflow implementation intake requests",
        "IMPLEMENTATION_INTAKE_API_BASE_URL",
        "/implementation-intakes",
        "requests",
        source_method="POST",
        lookback_days=30,
        trigger_mode="webhook",
    ),
    "20-crm-signal-normalizer": _spec(
        "20-crm-signal-normalizer",
        "CRM Signal Normalizer",
        "Normalizes Salesforce, Dynamics 365, HubSpot, or custom CRM records into a canonical opportunity, account, and contact payload that downstream Backstory workflows can reuse.",
        """You are a CRM normalization assistant.

For each batch of CRM records, produce:
- canonical entity mapping summary
- fields that mapped cleanly
- fields that need transformation or fallback logic
- identity and deduplication risks
- downstream workflow implications
""",
        """Run the CRM Signal Normalizer workflow:
1. Call get_run_context() and load_records().
2. For each CRM record batch, determine the source CRM and object family.
3. Normalize account, contact, opportunity, owner, stage, amount, and
   activity fields into a canonical workflow payload.
4. Highlight mapping gaps, schema drift, and records that need manual review.
5. Compile a normalization report plus the canonical output examples.
6. Deliver the report to Slack and optionally email.
""",
        "CRM records that need canonical normalization",
        "CRM_API_BASE_URL",
        "/crm/changed-records",
        "records",
        lookback_days=7,
    ),
    "21-meeting-intelligence-normalizer": _spec(
        "21-meeting-intelligence-normalizer",
        "Meeting Intelligence Normalizer",
        "Normalizes calendars, transcripts, attendees, and action items from Gong, Zoom, Teams, Otter, Fireflies, Fathom, and other note-taker systems into one reusable meeting-intelligence payload.",
        """You are a meeting intelligence normalization assistant.

For each meeting source payload, explain:
- the canonical meeting object that should be produced
- the attendee, transcript, and action-item fields that mapped correctly
- account-association and identity risks
- missing signals that downstream briefing or coaching workflows will care about
""",
        """Run the Meeting Intelligence Normalizer workflow:
1. Call get_run_context() and load_records().
2. For each meeting or transcript payload, identify the source calendar or
   note-taker system and normalize it into a shared meeting schema.
3. Extract attendee, timeline, transcript, action-item, and account-mapping
   fields needed by downstream workflows.
4. Flag ambiguous owners, missing CRM/account links, or partial transcripts.
5. Compile a normalization report with canonical payload examples.
6. Deliver the report to Slack and optionally email.
""",
        "meeting events and note-taker payloads for normalization",
        "MEETING_SOURCE_API_BASE_URL",
        "/meeting-intelligence/recent",
        "meetings",
        lookback_days=3,
    ),
    "22-multi-channel-delivery-router": _spec(
        "22-multi-channel-delivery-router",
        "Multi-Channel Delivery Router",
        "Receives a formatted workflow insight payload, resolves the correct Slack, Teams, email, or webhook destination, adapts the message for the target surface, and applies fallback routing rules.",
        """You are a delivery routing assistant.

For each inbound insight payload, produce:
- routing decision and why it was selected
- destination surface and fallback path
- format adjustments needed for Slack, Teams, email, or webhook delivery
- identity mapping or permissions issues that could block delivery
""",
        """Run the Multi-Channel Delivery Router workflow:
1. Call get_run_context() and load_records().
2. For each inbound insight payload, identify the account, owner, audience,
   and preferred destination from config or routing metadata.
3. Adapt the message for the target surface and note any fallback behavior.
4. Compile a routing report highlighting successful paths and delivery risks.
5. Deliver the report to Slack and optionally email.
""",
        "formatted workflow insights waiting for routed delivery",
        "ROUTING_API_BASE_URL",
        "/delivery-queue",
        "messages",
        source_method="POST",
        lookback_days=7,
        trigger_mode="webhook",
    ),
    "23-identity-resolution-hub": _spec(
        "23-identity-resolution-hub",
        "Identity Resolution Hub",
        "Resolves people, accounts, owners, channels, and meeting participants across CRM, messaging, and meeting systems into a canonical identity layer that downstream workflows can trust.",
        """You are an identity resolution assistant.

For each identity candidate batch, produce:
- canonical identity summary
- source records that matched cleanly
- ambiguous joins that need human review
- confidence risks across CRM, messaging, and meeting systems
- downstream workflow implications
""",
        """Run the Identity Resolution Hub workflow:
1. Call get_run_context() and load_records().
2. For each identity candidate batch, inspect people, account, owner, and
   channel identifiers coming from CRM, messaging, and meeting systems.
3. Resolve stable canonical identities using email, domain, external IDs,
   aliases, and source precedence rules.
4. Flag ambiguous joins, duplicate humans, and mismatched account ownership.
5. Compile an identity resolution report with canonical examples.
6. Deliver the report to Slack and optionally email.
""",
        "identity candidate batches across CRM, messaging, and meeting sources",
        "IDENTITY_API_BASE_URL",
        "/identity-candidates",
        "profiles",
        source_method="POST",
        lookback_days=14,
        trigger_mode="webhook",
    ),
    "24-workflow-contract-validator": _spec(
        "24-workflow-contract-validator",
        "Workflow Contract Validator",
        "Validates canonical payloads between workflow steps so schema drift, missing fields, and connector-specific shape changes are caught before they break downstream automations.",
        """You are a workflow contract validation assistant.

For each payload batch, produce:
- contract version assessed
- required fields that passed
- missing, renamed, or malformed fields
- likely source of drift
- downstream breakage risk and quarantine recommendation
""",
        """Run the Workflow Contract Validator workflow:
1. Call get_run_context() and load_records().
2. For each payload batch, identify the expected contract version and the
   workflow step that produced the payload.
3. Validate the payload against canonical required fields and known enums.
4. Flag schema drift, type mismatches, empty arrays, and routing metadata
   problems that would break downstream workflow steps.
5. Compile a validation report plus quarantine recommendations.
6. Deliver the report to Slack and optionally email.
""",
        "workflow payload batches waiting for contract validation",
        "WORKFLOW_CONTRACT_API_BASE_URL",
        "/payload-validations",
        "payloads",
        source_method="POST",
        lookback_days=7,
        trigger_mode="webhook",
    ),
    "25-implementation-gap-audit": _spec(
        "25-implementation-gap-audit",
        "Implementation Gap Audit",
        "Audits a customer stack or internal workflow request against the current library to identify what is already validated, what only has recipe coverage, and what still needs productization work.",
        """You are an implementation gap analysis assistant.

For each audit request, produce:
- validated assets already available
- recipe-only layers that still need connector work
- missing adapters or unvalidated components
- rollout risk by system family
- recommended backlog priorities
""",
        """Run the Implementation Gap Audit workflow:
1. Call get_run_context() and load_records().
2. For each audit request, inspect the target workflow goal and the current
   customer or internal stack across orchestration, CRM, meeting, and delivery.
3. Compare the request to validated assets in this library and identify what
   already exists vs what still needs adaptation.
4. Score the remaining gaps by implementation risk and productization value.
5. Compile an audit report with recommended backlog priorities and next steps.
6. Deliver the report to Slack and optionally email.
""",
        "implementation audit requests for customer or internal stack coverage",
        "IMPLEMENTATION_AUDIT_API_BASE_URL",
        "/implementation-audits",
        "audits",
        source_method="POST",
        lookback_days=30,
        trigger_mode="webhook",
    ),
    "26-orchestrator-migration-planner": _spec(
        "26-orchestrator-migration-planner",
        "Orchestrator Migration Planner",
        "Transforms a validated workflow pattern plus source-tool implementation details into a migration plan for n8n, Make, Power Automate, Zapier, Workato, or custom code without losing workflow order, state handling, or payload contracts.",
        """You are an orchestration migration assistant.

For each migration request, produce:
- recommended target implementation shape
- node or step equivalents across source and target orchestrators
- state, trigger, and retry differences that matter
- payload and auth migration risks
- staged migration and cutover guidance
""",
        """Run the Orchestrator Migration Planner workflow:
1. Call get_run_context() and load_records().
2. For each migration request, inspect the workflow pattern, the source
   orchestrator implementation, and the target orchestrator constraints.
3. Map node, trigger, auth, state, and delivery equivalents between source
   and target platforms.
4. Flag migration risks around retries, batching, scheduling, webhooks,
   credentials, and payload contracts.
5. Compile a migration blueprint with phased rollout guidance.
6. Deliver the report to Slack and optionally email.
""",
        "workflow migration requests across orchestration platforms",
        "WORKFLOW_MIGRATION_API_BASE_URL",
        "/workflow-migrations",
        "migrations",
        source_method="POST",
        lookback_days=30,
        trigger_mode="webhook",
    ),
    "27-adapter-regression-monitor": _spec(
        "27-adapter-regression-monitor",
        "Adapter Regression Monitor",
        "Replays golden payloads through CRM, meeting, identity, and delivery adapters to catch functional regressions before connector changes break reusable workflow patterns.",
        """You are an adapter regression QA assistant.

For each QA run, produce:
- adapters and scenarios checked
- cases that still pass expected behavior
- regressions or drift by adapter family
- likely root cause and blast radius
- recommended fix and replay priority
""",
        """Run the Adapter Regression Monitor workflow:
1. Call get_run_context() and load_records().
2. For each QA run, load the target adapters, golden payloads, and expected
   outputs for CRM, meeting, identity, or delivery layers.
3. Replay the scenarios and compare actual adapter output to the expected
   contract or golden result.
4. Flag regressions, behavior drift, or silent formatting changes.
5. Compile a QA report with root-cause hypotheses and replay priorities.
6. Deliver the report to Slack and optionally email.
""",
        "adapter QA runs and golden test scenarios",
        "ADAPTER_QA_API_BASE_URL",
        "/adapter-qa-runs",
        "runs",
        source_method="POST",
        lookback_days=14,
        trigger_mode="webhook",
    ),
    "28-rollout-readiness-scorecard": _spec(
        "28-rollout-readiness-scorecard",
        "Rollout Readiness Scorecard",
        "Scores whether a customer stack is actually ready for deployment by evaluating connector access, identity coverage, delivery routes, ownership, security prerequisites, and QA gates before a workflow goes live.",
        """You are a rollout readiness assessment assistant.

For each readiness request, produce:
- overall readiness score and launch recommendation
- passed vs missing prerequisites
- blockers by system family
- manual work still required before launch
- pilot, launch, and post-launch checkpoints
""",
        """Run the Rollout Readiness Scorecard workflow:
1. Call get_run_context() and load_records().
2. For each readiness request, inspect the desired workflow family, the
   available connectors, identity layer, delivery surfaces, owners, and
   security prerequisites.
3. Score the stack across access, mapping, QA, routing, and operational
   ownership readiness.
4. Flag launch blockers, soft risks, and manual mitigations.
5. Compile a readiness scorecard with pilot and go-live guidance.
6. Deliver the report to Slack and optionally email.
""",
        "customer rollout readiness requests for workflow deployment",
        "ROLLOUT_READINESS_API_BASE_URL",
        "/rollout-readiness-requests",
        "requests",
        source_method="POST",
        lookback_days=30,
        trigger_mode="webhook",
    ),
}
