# 06 — Executive Inbox

## Overview

The production template polls an inbox source contract for atomically leased unread external messages. Backstory MCP is limited to evidence enrichment and classification; urgency-to-channel mapping, notification eligibility, delivery, and observability are deterministic.

## Attached Platform Assets

- `full.json`: production n8n template
- `starter.json`: fixture-backed, dry-run-safe demo
- `workato-guide.pdf`: Workato implementation guide
- `zapier-guide.pdf`: Zapier implementation guide

## Contracts

- `run_context`: polling window, lease duration, dry-run, source, and routing destinations
- `source_record`: one unread external message with a stable message ID and sender metadata
- `enrichment_context`: Backstory MCP evidence used only during classification
- `delivery_payload`: deterministic recipient, triage body, thread key, and dedupe key

## Production Configuration

- `EI_SOURCE_API_BASE_URL`
- `EI_SOURCE_BEARER_TOKEN`
- `EI_URGENT_CHANNEL_ID`
- `EI_FOLLOWUP_CHANNEL_ID`
- `EI_DEFAULT_CHANNEL_ID`
- `EI_SUMMARY_CHANNEL_ID`
- `EI_LOOKBACK_HOURS`
- `EI_MAX_MESSAGES`
- `EI_CLAIM_TTL_MINUTES`
- `EI_DRY_RUN` (notifications remain disabled unless explicitly set to `false`)
- Shared source, identity routing, delivery renderer, and run-summary workflow IDs

## Design Rules

1. The source service atomically leases stable message IDs; expired leases are retryable.
2. Only unread external messages enter the classification path.
3. The model classifies evidence but cannot select channel IDs or perform side effects.
4. Urgent, follow-up, and informational routing is deterministic from environment config.
5. Informational messages are summarized without notification.
6. Native Slack delivery requires dry-run off, notification eligibility, and a target.
7. The starter uses fictional messages and cannot read an inbox or deliver by default.

## Required Shared Sub-workflows

- Shared — Source Adapter
- Shared — Identity And Channel Resolution
- Shared — Delivery Renderer
- Shared — Run Summary And Observability
