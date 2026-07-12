# 12 — Win/Loss Debrief Generator

## Overview

Automatically generates a structured win/loss debrief when any deal closes (won or lost). Triggered by a CRM webhook on stage change, the workflow pulls the full engagement timeline from Backstory — every meeting, email, contact involved, and engagement cadence throughout the deal cycle. An AI agent analyzes the timeline to produce a structured debrief: what worked, where engagement dropped, key turning points, multi-threading effectiveness, and lessons learned. The debrief is delivered to the rep, their manager, and optionally a shared enablement channel.

The production template uses canonical source, identity, delivery-rendering, and run-summary contracts. The model is limited to structured evidence analysis; source access, claims, routing, delivery, and observability are deterministic.

## Contracts

- `run_context`: mode, dry-run, source, lookback, and delivery defaults
- `source_record`: one canonical record with a stable source ID
- `enrichment_context`: Backstory MCP evidence used only during analysis
- `delivery_payload`: deterministic target, body, thread key, and dedupe key

## Production Configuration

- `WLD_SOURCE_API_BASE_URL`
- `WLD_SOURCE_BEARER_TOKEN`
- `WLD_DEFAULT_CHANNEL_ID`
- `WLD_SUMMARY_CHANNEL_ID`
- `WLD_LOOKBACK_DAYS`
- `WLD_MAX_RECORDS`
- `WLD_DRY_RUN`
- Shared source, identity, delivery renderer, and run-summary workflow IDs

## Safety

1. The source adapter owns stable IDs and processed-record claims.
2. The model returns JSON and cannot deliver or mutate systems.
3. Delivery requires dry-run off, notification eligibility, and a resolved target.
4. The starter uses a fictional fixture and cannot contact source or delivery systems by default.
