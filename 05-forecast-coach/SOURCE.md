# 05 — Forecast Coach

## Overview

This production template replaces inline roster parsing and CSV grouping with a shared source-adapter contract that emits one normalized leader pipeline packet per delivery target.

## Attached Platform Assets

- `full.json`: production n8n template
- `starter.json`: demo-safe starter asset
- `workato-guide.pdf`: branded Workato implementation guide PDF
- `zapier-guide.pdf`: branded Zapier implementation guide PDF

## Contracts

- `run_context`: workflow, trigger, quarter scope, mode, and dry-run defaults
- `source_record`: one leader-ready pipeline packet with rep coverage, deals, and owner metadata
- `enrichment_context`: MCP-backed coaching context used only during synthesis
- `delivery_payload`: deterministic email-ready report fields

## Configuration

- `FC_SOURCE_API_BASE_URL`
- `FC_FROM_EMAIL`
- `FC_REPORT_LIMIT`
- Shared source-adapter workflow ID

## Design Rules

1. The shared source adapter owns leader roster expansion and opportunity normalization.
2. The agent returns JSON only for coaching output.
3. Email delivery stays native and deterministic.
4. One report is generated per leader item, not by batching custom code in the main workflow.

## Required Shared Sub-workflows

- Shared — Source Adapter

