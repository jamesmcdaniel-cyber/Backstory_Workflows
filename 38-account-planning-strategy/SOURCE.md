# 38 — Account Planning & Strategy

## Overview

Generates an account-planning strategy brief by combining account status, recent account activity, stakeholder engagement, and situation context into account-level priorities and next steps.

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

- Requested account target and optional opportunity hint
- Slack destination for the planning brief
- Prompt structure for priorities, stakeholders, and strategic next steps

## Design Rules

1. Keep account and opportunity resolution deterministic.
2. Use MCP only for context retrieval and enrichment, not for delivery side effects.
3. Strip bound credentials before publishing the catalog asset.
4. Use the model only for the final synthesis step.
5. Deliver the result through native Slack or an equivalent messaging connector.

## Required Shared Sub-workflows

- None. This workflow is currently a self-contained legacy template.

## Imported Workflow Title

- `Account Planning & Strategy`

## Code-node budget: 5

This is a multi-call MCP orchestration workflow (parse input, resolve identifiers, merge several Backstory MCP responses, build the agent prompt, and format delivery). These steps are separated by MCP/agent nodes and cannot be collapsed without losing grounding fidelity, so the standard \`<= 4\` code-node limit is intentionally raised to 5 for this workflow.
