# 11 — Deal Hygiene Audit

## Overview

Performs a weekly pipeline hygiene audit by scanning all open opportunities in the CRM and cross-referencing with Backstory engagement data. Flags deals with stale close dates, no recent activity, missing next steps, single-threaded contacts, or no executive engagement. An AI agent prioritizes the issues and generates a per-rep action list with specific cleanup tasks. Delivered to reps and their managers via Messaging every Monday morning.

The production template uses canonical source, identity, delivery-rendering, and run-summary contracts. The model is limited to structured evidence analysis; source access, claims, routing, delivery, and observability are deterministic.

## Contracts

- `run_context`: mode, dry-run, source, lookback, and delivery defaults
- `source_record`: one canonical record with a stable source ID
- `enrichment_context`: Backstory MCP evidence used only during analysis
- `delivery_payload`: deterministic target, body, thread key, and dedupe key

## Production Configuration

- `DHA_SOURCE_API_BASE_URL`
- `DHA_SOURCE_BEARER_TOKEN`
- `DHA_DEFAULT_CHANNEL_ID`
- `DHA_SUMMARY_CHANNEL_ID`
- `DHA_LOOKBACK_DAYS`
- `DHA_MAX_RECORDS`
- `DHA_DRY_RUN`
- Shared source, identity, delivery renderer, and run-summary workflow IDs

## Safety

1. The source adapter owns stable IDs and processed-record claims.
2. The model returns JSON and cannot deliver or mutate systems.
3. Delivery requires dry-run off, notification eligibility, and a resolved target.
4. The starter uses a fictional fixture and cannot contact source or delivery systems by default.
