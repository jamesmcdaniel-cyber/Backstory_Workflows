# 29 — Digital Chief of Staff

## Overview

This reference workflow is the production-grade answer to the original DCOS example. It separates demo-safe behavior from production behavior, moves repeated logic into shared sub-workflows, and keeps agent + MCP usage bounded to enrichment and synthesis.

## Attached Platform Assets

- `full.json`: production n8n template
- `starter.json`: demo-safe n8n starter
- `workato-guide.pdf`: branded Workato implementation guide PDF
- `zapier-guide.pdf`: branded Zapier implementation guide PDF

## Contracts

- `run_context`: trigger metadata, mode, lookback, delivery mode, and dry-run flag
- `source_record`: normalized account, opportunity, and ops inputs returned by the shared source adapter
- `enrichment_context`: MCP-only enrichment output used by the synthesis steps
- `delivery_payload`: deterministic Slack delivery contract consumed by native nodes

## Design Rules

1. Native Slack and Google Calendar nodes own delivery side effects.
2. Shared sub-workflows own source access, routing, rendering, calendar writing, and run summaries.
3. Agents return JSON only.
4. MCP nodes are attached only to the two synthesis steps.

## Required Shared Sub-workflows

- Shared — Source Adapter
- Shared — Identity And Channel Resolution
- Shared — Delivery Renderer
- Shared — Calendar And Task Writer
- Shared — Run Summary And Observability
