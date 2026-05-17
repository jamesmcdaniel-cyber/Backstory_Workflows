# Workflow Contracts

This catalog now treats every implementation as four explicit contracts. The same shapes should appear in `full.json`, `starter.json`, `SOURCE.md`, `recipe-card.md`, and the Python agent runtimes.

## `run_context`

Required fields:

- `workflow_id`
- `mode`
- `trigger_type`
- `lookback_days`
- `delivery_mode`
- `dry_run`

Recommended companion fields:

- `workflow_name`
- `run_timestamp_utc`
- `source_summary`

## `source_record`

Normalized fields expected across implementations:

- `source_system`
- `source_id`
- `source_url`
- `owner`
- `account_name`
- `opportunity_name`
- `workflow_specific_fields`
- `raw_record`

Rule: keep the original source payload available under `raw_record`, but expose the normalized fields at the top level so agents, code runtimes, and cross-tool adapters can rely on one stable shape.

## `enrichment_context`

Required fields:

- `summary`
- `confidence`
- `source_refs`
- `tool_results`

Rule: MCP tools and other enrichment layers may add context, but routing and delivery steps should consume the summarized `enrichment_context`, not directly call tools again.

## `delivery_payload`

Required fields:

- `target_type`
- `target_id`
- `format`
- `title`
- `body`
- `blocks_or_html`
- `thread_key`
- `dedupe_key`

Rule: agents produce structured content first. Native delivery nodes are responsible for formatting and transport side effects.
