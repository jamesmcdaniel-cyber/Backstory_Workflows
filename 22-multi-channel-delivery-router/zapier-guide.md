# Multi-Channel Delivery Router — Zapier Implementation Guide

This file is a plain-English implementation guide. It is not an importable JSON artifact.

Zapier does not accept a reusable “upload this workflow JSON” format for the kind of cross-workspace assets this catalog is describing. To replicate this workflow in Zapier, build it as one or more Zaps plus, when needed, a custom Zapier app. If you want a reusable public Zap Template, every integration in the template must be a public integration, and Zapier rejects templates that include Code, custom Webhook, or custom Formatter steps. If you are creating workflows through Zapier workflow-creation APIs, use Public Apps because private apps are not supported there.

## Workflow Summary

- Workflow ID: `22-multi-channel-delivery-router`
- Category: platform-enablement
- Source trigger in this catalog: Webhook / Sub-workflow |
- Recommended Zapier trigger surface: Sub-Zap orchestration via Zapier Tables, Interfaces, or a parent app trigger
- Delivery targets: Slack channel or direct message, Microsoft Teams channel or chat, Email delivery, Webhook, queue, database, or downstream workflow sink

## What To Build In Zapier

- Slack app actions for channel posts and direct messages
- Microsoft Teams app actions or companion Microsoft 365 app steps
- SMTP-capable email action or a native Gmail/Outlook delivery app
- Zapier Tables or Storage for state, routing maps, and dedupe keys
- Approved webhook sink, database action, queue adapter, or downstream custom app action for publication

## Recommended Implementation Shape

1. Confirm the required public or workspace-native Zapier apps are available before you build the workflow.
2. Create the primary Zap with the trigger and the minimum deterministic steps needed to gather source data and reach structured synthesis.
3. Split delivery, approvals, or fan-out into additional Zaps when the workflow naturally decomposes or when public-template restrictions would block a single-Zap design.
4. Use Zapier Tables or Storage for routing maps, dedupe keys, approval state, or cross-Zap handoff instead of hiding state in code.
5. If you plan to publish a public Zap Template, test the template path separately from any internal/private workspace build.

## Custom App Actions To Provide

- `load_routing_map`

## Zaps To Create

- `22_multi_channel_delivery_router_primary_zap` — Trigger: Sub-Zap orchestration via Zapier Tables, Interfaces, or a parent app trigger. Native steps: Native app step: Resolve Destination -> AI step backed by a native LLM app returning strict JSON for Adapt Message Format -> Native delivery step: database, queue, webhook, or downstream app action for Deliver to Preferred Channel -> Native delivery step: Slack app action for Apply Fallback Route. Notes: Keep the primary Zap focused on normalization, source access, and structured synthesis. Route secondary fan-out through additional native Zaps when template restrictions or retry requirements demand decomposition.
- `22_multi_channel_delivery_router_delivery_or_followup_zap` — Trigger: Zapier Tables state change, Interfaces action, or an upstream custom app event. Native steps: Read delivery_payload and target metadata from structured fields -> Slack app action: Send Channel Message or Send Direct Message -> Microsoft Teams app action or Microsoft 365 companion action -> Gmail, Outlook, or Email by Zapier action -> Approved webhook sink, database action, queue adapter, or downstream custom app action. Notes: Use this secondary Zap when you need reusable delivery fan-out, fallback paths, or approval boundaries without falling back to Webhooks or Code steps.

## Contracts To Preserve

- `run_context`: workflow-level execution context such as trigger, mode, lookback, delivery mode, and dry-run state.
- `source_record`: normalized business record from the source adapter or source-system action layer.
- `enrichment_context`: MCP or native app enrichment results used only during synthesis.
- `delivery_payload`: deterministic delivery fields for the final native connector or app action.

## Structured AI Requirements

- `adapt_message_format`: return JSON only with keys `title`, `summary`, `confidence`, `recommended_actions`, `source_refs`. Intent: Transforms the same insight into Slack-safe markdown, Teams-safe copy/cards, email HTML/plain text, or webhook-safe JSON envelopes.

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
