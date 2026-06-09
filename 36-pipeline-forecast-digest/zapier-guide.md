# Pipeline & Forecast Digest — Zapier Implementation Guide

This file is a plain-English implementation guide. It is not an importable JSON artifact.

Zapier does not accept a reusable “upload this workflow JSON” format for the kind of cross-workspace assets this catalog is describing. To replicate this workflow in Zapier, build it as one or more Zaps plus, when needed, a custom Zapier app. If you want a reusable public Zap Template, every integration in the template must be a public integration, and Zapier rejects templates that include Code, custom Webhook, or custom Formatter steps. If you are creating workflows through Zapier workflow-creation APIs, use Public Apps because private apps are not supported there.

## Workflow Summary

- Workflow ID: `36-pipeline-forecast-digest`
- Category: pipeline-forecasting
- Source trigger in this catalog: Slack command / Webhook — digest request |
- Recommended Zapier trigger surface: Private custom Zapier app trigger or internal Catch Hook rollout path
- Delivery targets: Slack channel or direct message

## What To Build In Zapier

- Published Backstory custom Zapier app with explicit search and create actions
- Slack app actions for channel posts and direct messages

## Recommended Implementation Shape

1. Publish the Backstory integration as a custom Zapier app before you try to templatize the workflow. Use the Zapier Platform UI or CLI if you need custom triggers or actions.
2. Create the primary Zap with the trigger and the minimum deterministic steps needed to gather source data and reach structured synthesis.
3. Keep the workflow in one Zap if the trigger, source access, and delivery can stay within Zapier’s supported template and app boundaries.
4. Keep routing and field mapping explicit in native steps rather than burying them in ad hoc code.
5. If you plan to publish a public Zap Template, test the template path separately from any internal/private workspace build.

## Custom App Actions To Provide

- `backstory_list_source_records`
- `backstory_get_record_context`
- `backstory_publish_run_summary`

## Zaps To Create

- `36_pipeline_forecast_digest_primary_zap` — Trigger: Private custom Zapier app trigger or internal Catch Hook rollout path. Native steps: Backstory custom Zapier app action: pull_top_records -> Backstory custom Zapier app action: enrich_each_opportunity -> Backstory custom Zapier app action: aggregate_digest_inputs -> AI step backed by a native LLM app returning strict JSON for Generate Forecast Digest -> Native delivery step: Slack app action for Post Digest. Notes: This Zap stays native-first and should rely on published app actions rather than ad hoc API requests.

## Contracts To Preserve

- `run_context`: workflow-level execution context such as trigger, mode, lookback, delivery mode, and dry-run state.
- `source_record`: normalized business record from the source adapter or source-system action layer.
- `enrichment_context`: MCP or native app enrichment results used only during synthesis.
- `delivery_payload`: deterministic delivery fields for the final native connector or app action.

## Structured AI Requirements

- `generate_forecast_digest`: return JSON only with keys `title`, `summary`, `confidence`, `recommended_actions`, `source_refs`. Intent: Synthesizes the top risks, movements, and next actions into a compact digest.

## Validation Checklist

- Do not treat this guide as an importable JSON workflow; build the workflow as one or more Zaps and, if needed, a custom Zapier app.
- If you want a reusable public Zap Template, only public integrations can be used in the template.
- Do not include Code, custom Webhook, or custom Formatter steps in a public Zap Template.
- If you are creating workflows through Zapier workflow-creation APIs, use Public Apps only and avoid Paths because they are not currently supported there.
- Validate structured AI output before any Slack, Teams, email, calendar, Jira, or sink action runs.

## Official References

- [Zap templates restrictions](https://docs.zapier.com/integrations/publish/zap-templates)
- [Known limitations for workflow creation](https://docs.zapier.com/powered-by-zapier/zap-creation/known-limitations)
- [Build with CLI](https://docs.zapier.com/integrations/build-cli/overview)
- [Zapier action design](https://docs.zapier.com/integrations/build/action)
- [Add a create action](https://docs.zapier.com/integrations/build/create)
- [AI actions](https://docs.zapier.com/integrations/reference/ai-actions)
- [Custom actions and API requests actions](https://docs.zapier.com/integrations/reference/custom-actions-api-requests)
