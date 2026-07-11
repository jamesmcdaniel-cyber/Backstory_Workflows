# 02 — Meeting Brief

## Overview

The production template polls a shared meeting-source contract every 15 minutes for upcoming external meetings that have not already been briefed. Backstory MCP is limited to evidence enrichment and structured synthesis; identity resolution, formatting, delivery, dedupe ownership, and observability remain deterministic.

## Attached Platform Assets

- `full.json`: production n8n template
- `starter.json`: fixture-backed, dry-run-safe demo
- `workato-guide.pdf`: Workato implementation guide
- `zapier-guide.pdf`: Zapier implementation guide

## Contracts

- `run_context`: briefing window, lookback, mode, dry-run, source, and delivery defaults
- `source_record`: one external meeting with stable meeting ID, owner, account, time, and attendees
- `enrichment_context`: Backstory MCP evidence used only during synthesis
- `delivery_payload`: deterministic recipient, brief body, meeting thread key, and dedupe key

## Production Configuration

- `MB_SOURCE_API_BASE_URL`
- `MB_SOURCE_BEARER_TOKEN`
- `MB_DEFAULT_CHANNEL_ID`
- `MB_SUMMARY_CHANNEL_ID`
- `MB_WINDOW_MINUTES`
- `MB_LOOKBACK_DAYS`
- `MB_MAX_MEETINGS`
- `MB_DRY_RUN` (delivery remains disabled unless explicitly set to `false`)
- Shared source, identity routing, delivery renderer, and run-summary workflow IDs

## Design Rules

1. The source adapter owns calendar normalization, external-attendee filtering, and already-briefed suppression.
2. Every meeting needs a stable source ID for deduplication.
3. The model returns strict JSON and never performs delivery side effects.
4. Unsupported claims are reported as missing data instead of invented.
5. Native Slack delivery runs only when dry-run is false and a target is present.
6. The starter uses fictional fixtures and cannot contact a calendar or deliver by default.

## Required Shared Sub-workflows

- Shared — Source Adapter
- Shared — Identity And Channel Resolution
- Shared — Delivery Renderer
- Shared — Run Summary And Observability
