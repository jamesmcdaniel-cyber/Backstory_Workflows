# 31 — Deal Inspection (Slack /dealcheck)

## Overview

Runs a slash-command deal inspection by resolving the requested account and opportunity, pulling Backstory deal context, and returning the top risk, supporting evidence, and next actions in Slack.

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

- Slash-command request body mapping for account text and channel target
- Default Slack channel placeholder for manual tests
- Backstory MCP endpoint headers and auth setup
- Model selection and output length for the final deal summary

## Design Rules

1. Keep account and opportunity resolution deterministic.
2. Use MCP only for context retrieval and enrichment, not for delivery side effects.
3. Strip bound credentials before publishing the catalog asset.
4. Use the model only for the final synthesis step.
5. Deliver the result through native Slack or an equivalent messaging connector.

## Required Shared Sub-workflows

- None. This workflow is currently a self-contained legacy template.

## Imported Workflow Title

- `Deal Inspection (Slack /dealcheck)`

