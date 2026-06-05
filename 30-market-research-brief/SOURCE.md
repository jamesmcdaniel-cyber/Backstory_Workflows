# 30 — Market Research Brief

## Overview

This pilot template turns normalized market-intelligence packets into a weekly account-research digest by combining external company signals with Backstory relationship context through one bounded synthesis pass.

## Attached Platform Assets

- `full.json`: pilot n8n template
- `starter.json`: demo-safe starter asset
- `workato-guide.pdf`: branded Workato implementation guide PDF
- `zapier-guide.pdf`: branded Zapier implementation guide PDF

## Contracts

- `run_context`: workflow, trigger, lookback, mode, dry-run, and delivery defaults
- `source_record`: one account-scoped research packet with market signals and owner metadata
- `enrichment_context`: MCP-backed account and opportunity context used only during synthesis
- `delivery_payload`: deterministic digest payload for Slack and email delivery

## Configuration

- `MRB_SOURCE_API_BASE_URL`
- `MRB_DEFAULT_CHANNEL_ID`
- `MRB_SUMMARY_EMAIL`
- `MRB_MAX_TARGETS`
- `MRB_INCLUDE_COMPETITOR_WATCH`
- Shared source-adapter workflow ID

## Design Rules

1. The shared source adapter owns research-packet intake and account normalization.
2. External market signals arrive through the source record; MCP is used only for internal context and synthesis.
3. The agent returns JSON only for ranking and brief generation.
4. Slack and email delivery stay native and deterministic.
5. The workflow produces one weekly digest for the research review channel and summary email list.

## Required Shared Sub-workflows

- Shared — Source Adapter

