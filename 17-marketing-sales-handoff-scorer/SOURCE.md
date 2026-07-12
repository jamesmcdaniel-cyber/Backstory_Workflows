# 17 — Marketing-to-Sales Handoff Scorer

## Overview

Enriches marketing-qualified leads at the moment of handoff by checking Backstory for existing engagement history. When a new MQL is created in the CRM or marketing automation platform, the workflow queries Backstory to see if the account already has relationship history — prior meetings, email threads, known contacts, or past opportunities. An AI agent scores the handoff quality (hot / warm / cold) and generates a context brief for the receiving SDR or AE, so they never walk into a "cold" call that's actually warm. Delivered instantly via Messaging.

The production template uses canonical source, identity, delivery-rendering, and run-summary contracts. The model is limited to structured evidence analysis; source access, claims, routing, delivery, and observability are deterministic.

## Contracts

- `run_context`: mode, dry-run, source, lookback, and delivery defaults
- `source_record`: one canonical record with a stable source ID
- `enrichment_context`: Backstory MCP evidence used only during analysis
- `delivery_payload`: deterministic target, body, thread key, and dedupe key

## Production Configuration

- `MSHS_SOURCE_API_BASE_URL`
- `MSHS_SOURCE_BEARER_TOKEN`
- `MSHS_DEFAULT_CHANNEL_ID`
- `MSHS_SUMMARY_CHANNEL_ID`
- `MSHS_LOOKBACK_DAYS`
- `MSHS_MAX_RECORDS`
- `MSHS_DRY_RUN`
- Shared source, identity, delivery renderer, and run-summary workflow IDs

## Safety

1. The source adapter owns stable IDs and processed-record claims.
2. The model returns JSON and cannot deliver or mutate systems.
3. Delivery requires dry-run off, notification eligibility, and a resolved target.
4. The starter uses a fictional fixture and cannot contact source or delivery systems by default.
