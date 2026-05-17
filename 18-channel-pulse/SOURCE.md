# 18 — Channel Pulse

## Overview

This production template replaces raw Slack lookup calls and bespoke routing code with normalized trigger contracts, a shared source adapter, shared delivery routing, and native Slack posting.

## Attached Platform Assets

- `full.json`: production n8n template
- `starter.json`: demo-safe starter asset
- `workato-template.json`: native-first Workato blueprint
- `zapier-template.json`: native-first Zapier blueprint bundle

## Contracts

- `run_context`: trigger metadata, lookback, routing defaults, mode, and dry-run state
- `source_record`: one account update candidate with route metadata and account context
- `enrichment_context`: MCP-backed activity analysis used only for synthesis
- `delivery_payload`: deterministic Slack message payload

## Configuration

- `CP_SOURCE_API_BASE_URL`
- `CP_DEFAULT_CHANNEL_ID`
- `CP_MIN_ACV`
- Shared source-adapter, identity-resolution, and delivery-renderer workflow IDs

## Design Rules

1. Schedule and webhook triggers collapse into one `run_context`.
2. The shared source adapter owns account selection and route metadata.
3. The agent returns JSON only; MCP is used only during synthesis.
4. Shared routing and renderer sub-workflows own target resolution and Slack payload shaping.
5. Native Slack nodes handle all delivery side effects.

## Required Shared Sub-workflows

- Shared — Source Adapter
- Shared — Identity And Channel Resolution
- Shared — Delivery Renderer

