# 16 — Executive Sponsor Tracker

## Overview

Monitors executive-level contact engagement across strategic deals to ensure champion and sponsor relationships stay active. The workflow identifies open opportunities above a configurable deal value threshold, checks Backstory for executive contact engagement (VP+ titles), and flags deals where executive sponsors have gone silent (no meetings or emails in the configured lookback window). An AI agent assesses the risk of each silent-sponsor situation and recommends re-engagement tactics. Alerts are sent to the deal owner and sales leadership via Messaging.

The production template uses canonical source, identity, delivery-rendering, and run-summary contracts. The model is limited to structured evidence analysis; source access, claims, routing, delivery, and observability are deterministic.

## Contracts

- `run_context`: mode, dry-run, source, lookback, and delivery defaults
- `source_record`: one canonical record with a stable source ID
- `enrichment_context`: Backstory MCP evidence used only during analysis
- `delivery_payload`: deterministic target, body, thread key, and dedupe key

## Production Configuration

- `EST_SOURCE_API_BASE_URL`
- `EST_SOURCE_BEARER_TOKEN`
- `EST_DEFAULT_CHANNEL_ID`
- `EST_SUMMARY_CHANNEL_ID`
- `EST_LOOKBACK_DAYS`
- `EST_MAX_RECORDS`
- `EST_DRY_RUN`
- Shared source, identity, delivery renderer, and run-summary workflow IDs

## Safety

1. The source adapter owns stable IDs and processed-record claims.
2. The model returns JSON and cannot deliver or mutate systems.
3. Delivery requires dry-run off, notification eligibility, and a resolved target.
4. The starter uses a fictional fixture and cannot contact source or delivery systems by default.
