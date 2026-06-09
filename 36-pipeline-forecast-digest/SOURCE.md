# 36 — Pipeline & Forecast Digest

## Overview

Builds a pipeline and forecast digest by pulling top records, expanding at-risk opportunities, enriching each one with context, and summarizing the highest-priority forecast issues in Slack.

## Attached Platform Assets

- `full.json`: legacy n8n template
- `starter.json`: demo-safe starter asset
- `workato-guide.pdf`: branded Workato implementation guide PDF
- `zapier-guide.pdf`: branded Zapier implementation guide PDF

## Contracts

- `request_context`: trigger payload, target account or opportunity hint, and delivery defaults
- `backstory_context`: account, opportunity, activity, stakeholder, or situation-search data collected from MCP
- `analysis_result`: structured model output used to produce the final operator-facing brief
- `delivery_payload`: Slack-ready text or block payload posted by the final step

## Configuration

- Top-record query scope and at-risk opportunity filters
- Slack destination for the digest
- Aggregation rules for per-opportunity context before synthesis

## Design Rules

1. Keep account and opportunity resolution deterministic.
2. Use MCP only for context retrieval and enrichment, not for delivery side effects.
3. Strip bound credentials before publishing the catalog asset.
4. Use the model only for the final synthesis step.
5. Deliver the result through native Slack or an equivalent messaging connector.

## Required Shared Sub-workflows

- None. This workflow is currently a self-contained legacy template.

## Imported Workflow Title

- `Pipeline & Forecast Digest`

