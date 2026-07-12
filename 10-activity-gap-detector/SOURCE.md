# 10 — Activity Gap Detector

## Overview

Compares each rep's weekly activity patterns against team benchmarks and top performer profiles using Backstory activity data. Identifies reps with low outbound activity, thin multi-threading on key deals, or single-threaded opportunities missing executive engagement. An AI agent generates personalized coaching nudges for sales managers, highlighting specific gaps and suggesting actionable improvement areas. Delivered weekly to frontline managers via Messaging.

The production template uses canonical source, identity, delivery-rendering, and run-summary contracts. The model is limited to structured evidence analysis; source access, claims, routing, delivery, and observability are deterministic.

## Contracts

- `run_context`: mode, dry-run, source, lookback, and delivery defaults
- `source_record`: one canonical record with a stable source ID
- `enrichment_context`: Backstory MCP evidence used only during analysis
- `delivery_payload`: deterministic target, body, thread key, and dedupe key

## Production Configuration

- `AGD_SOURCE_API_BASE_URL`
- `AGD_SOURCE_BEARER_TOKEN`
- `AGD_DEFAULT_CHANNEL_ID`
- `AGD_SUMMARY_CHANNEL_ID`
- `AGD_LOOKBACK_DAYS`
- `AGD_MAX_RECORDS`
- `AGD_DRY_RUN`
- Shared source, identity, delivery renderer, and run-summary workflow IDs

## Safety

1. The source adapter owns stable IDs and processed-record claims.
2. The model returns JSON and cannot deliver or mutate systems.
3. Delivery requires dry-run off, notification eligibility, and a resolved target.
4. The starter uses a fictional fixture and cannot contact source or delivery systems by default.
