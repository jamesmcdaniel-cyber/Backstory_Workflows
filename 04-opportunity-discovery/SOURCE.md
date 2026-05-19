# 04 — Opportunity Discovery

## Overview

This production template replaces the legacy CSV-heavy export logic with a shared source-adapter contract that returns candidate accounts already normalized for opportunity discovery.

## Attached Platform Assets

- `full.json`: production n8n template
- `starter.json`: demo-safe starter asset
- `workato-guide.md`: plain-English Workato implementation guide
- `zapier-guide.md`: plain-English Zapier implementation guide

## Contracts

- `run_context`: workflow, trigger, lookback, mode, dry-run, and delivery defaults
- `source_record`: one candidate account with owner, account context, and source metadata
- `enrichment_context`: MCP-backed signal analysis used only during synthesis
- `delivery_payload`: deterministic digest payload for Slack and email delivery

## Configuration

- `OD_SOURCE_API_BASE_URL`
- `OD_DEFAULT_CHANNEL_ID`
- `OD_SUMMARY_EMAIL`
- `OD_ENGAGEMENT_THRESHOLD`
- `OD_MAX_ACCOUNTS`
- Shared source-adapter workflow ID

## Design Rules

1. The shared source adapter owns engagement and pipeline-gap normalization.
2. The agent returns JSON only; MCP is used only for enrichment and synthesis.
3. Slack and email delivery stay native and deterministic.
4. The workflow produces one digest for the shared review channel and summary email list.

## Required Shared Sub-workflows

- Shared — Source Adapter

