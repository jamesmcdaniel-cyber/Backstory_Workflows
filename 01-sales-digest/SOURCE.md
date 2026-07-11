# 01 — Sales Digest

## Overview

The production template uses shared contracts for subscriber loading, identity routing, delivery rendering, and run observability. The AI step is bounded to Backstory enrichment and structured digest synthesis; routing and Slack delivery remain deterministic.

## Attached Platform Assets

- `full.json`: production n8n template
- `starter.json`: fixture-backed, dry-run-safe demo
- `workato-guide.pdf`: Workato implementation guide
- `zapier-guide.pdf`: Zapier implementation guide

## Contracts

- `run_context`: schedule, mode, lookback, dry-run, source, and delivery defaults
- `source_record`: one subscriber packet with owner and relevant account/deal inputs
- `enrichment_context`: Backstory MCP evidence used only during synthesis
- `delivery_payload`: deterministic Slack target, body, thread key, and dedupe key

## Production Configuration

- `SD_SOURCE_API_BASE_URL`
- `SD_SOURCE_BEARER_TOKEN`
- `SD_DEFAULT_CHANNEL_ID`
- `SD_SUMMARY_CHANNEL_ID`
- `SD_LOOKBACK_HOURS`
- `SD_MAX_SUBSCRIBERS`
- `SD_DRY_RUN` (delivery remains disabled unless explicitly set to `false`)
- Shared source, identity routing, delivery renderer, and run-summary workflow IDs

## Design Rules

1. The shared source adapter owns subscriber and source-system normalization.
2. The model returns strict JSON and never performs delivery side effects.
3. Missing evidence is surfaced instead of invented.
4. The identity and delivery sub-workflows own target resolution and payload formatting.
5. Native Slack delivery runs only when dry-run is false and a target is present.
6. The starter uses fictional fixtures and cannot send a message by default.

## Required Shared Sub-workflows

- Shared — Source Adapter
- Shared — Identity And Channel Resolution
- Shared — Delivery Renderer
- Shared — Run Summary And Observability
