# Identity Resolution Hub — Workato Implementation Guide

This file is a plain-English implementation guide. It is not an importable JSON artifact.

Workato moves reusable automation between workspaces as recipe packages, and package import uses a `.zip` file in Recipe Lifecycle Management. Imported connections arrive as placeholders and must be authenticated in the destination workspace. Build this workflow in Workato as recipes, recipe functions, connectors, properties, and tables, then export/import the package when you need to promote it between environments.

## Workflow Summary

- Workflow ID: `23-identity-resolution-hub`
- Category: platform-enablement
- Source trigger in this catalog: Webhook / CDC / Sub-workflow |
- Recommended Workato trigger surface: Callable recipe or Recipe Function invocation from a parent orchestrator
- Delivery targets: Email delivery, Calendar event or task, Webhook, queue, database, or downstream workflow sink

## What To Create In Workato

- Gmail, Microsoft Outlook, or approved email connector for message delivery
- Google Calendar or Microsoft 365 Calendar connector for event and task creation
- Meeting-system connector or approved custom connector for transcript intake
- Lookup tables, data tables, or project properties for routing and canonical maps
- Webhook connector, database connector, queue adapter, or downstream orchestrator action

## Build Order

1. Create or choose the target project and folder where this workflow will live.
2. Confirm the native source-system connectors needed by this workflow are installed and authenticated.
3. Create the Recipe Function `normalize_run_context` so reusable logic is not trapped inside one large recipe.
4. Create the Recipe Function `load_source_records` so reusable logic is not trapped inside one large recipe.
5. Create the Recipe Function `assemble_business_context` so reusable logic is not trapped inside one large recipe.
6. Create the Recipe Function `render_delivery_payload` so reusable logic is not trapped inside one large recipe.
7. Create the Recipe Function `record_run_summary` so reusable logic is not trapped inside one large recipe.
8. Build the primary recipe `23_identity_resolution_hub_primary_recipe` with the trigger surface Callable recipe or Recipe Function invocation from a parent orchestrator.
9. Store routing defaults, destination IDs, and mode switches in connections, environment properties, project properties, lookup tables, or data tables.
10. Test the recipe and each function with representative payloads, then export the project as a Workato package `.zip` if you need to move it to QA or production.

## Recipe Functions To Create

- `normalize_run_context`: Normalize the Identity Resolution Hub trigger into the shared run_context contract. Inputs: trigger_payload, workflow defaults. Outputs: run_context. Native features: Recipe function by Workato, Formula mode, Variables.
- `load_source_records`: Load and normalize the primary Identity Resolution Hub business inputs into source_record objects. Inputs: run_context. Outputs: source_record[]. Native features: Recipe function by Workato, Meeting-system connector action, Lookup tables or data tables.
- `assemble_business_context`: Join the intermediate context needed for Identity Resolution Hub, especially Normalize Identifiers, Match Canonical Entities. Inputs: source_record[], run_context. Outputs: source_record[], enrichment_context candidates. Native features: Lists, Object actions, Data tables.
- `render_delivery_payload`: Render normalized delivery_payload objects for Identity Resolution Hub. Inputs: structured_ai_json, source_record, run_context. Outputs: delivery_payload. Native features: Recipe function by Workato, Object construction, Formula mode.
- `record_run_summary`: Capture deterministic summary, dedupe, and retry state for Identity Resolution Hub. Inputs: run_context, delivery results. Outputs: execution summary. Native features: Variables, Data tables.

## Primary Recipe Outline

1. Call normalize_run_context
2. Use email connector action for Normalize Identifiers
3. Use native connector action for Match Canonical Entities
4. Use an LLM connector or AI step to return strict JSON for AI Ambiguity Review
5. Use database, queue, webhook, or downstream app connector for Publish Canonical Identity Update
6. Record deterministic run summary and retry state

## Contracts To Preserve

- `run_context`: workflow-level execution context such as trigger, mode, lookback, delivery mode, and dry-run state.
- `source_record`: normalized business record from the source adapter or source-system action layer.
- `enrichment_context`: MCP or native app enrichment results used only during synthesis.
- `delivery_payload`: deterministic delivery fields for the final native connector or app action.

## Structured AI Requirements

- `ai_ambiguity_review`: return JSON only with keys `title`, `summary`, `confidence`, `recommended_actions`, `source_refs`. Intent: AI Agent explains duplicate humans, merged subsidiaries, or alias conflicts before the identity graph is updated broadly.

## Validation Checklist

- No repeated Universal HTTP or custom-action sprawl for Slack, calendar, CRM, or email delivery when a native connector exists.
- All secrets live in connections, environment properties, or project properties rather than formula literals.
- LLM or agent output is validated as structured JSON before any delivery or persistence step runs.
- Recipe Functions, lookup tables, and data tables own reuse, routing, and dedupe instead of large inline scripts.
- If this build is moved between workspaces, export and import it as a Workato package `.zip`, then reconnect placeholder connections in the target workspace.

## Official References

- [Recipe lifecycle management](https://docs.workato.com/en/recipe-development-lifecycle.html)
- [Importing packages](https://docs.workato.com/en/recipe-development-lifecycle/import.html)
- [Recipe function by Workato](https://docs.workato.com/connectors/recipe-functions.html)
- [Using the Workato Connector SDK](https://docs.workato.com/en/developing-connectors/sdk/quickstart/quickstart.html)
- [Slack connector](https://docs.workato.com/connectors/slack.html)
- [Google Calendar connector](https://docs.workato.com/en/connectors/google-calendar.html)
