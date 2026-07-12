# Onboarding Pulse — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> canonical source adapter -> Backstory enrichment -> structured analysis -> identity resolution -> delivery renderer -> native delivery -> run summary`

## Implementation Rules

1. Normalize connector-specific data into one canonical source record.
2. Use Backstory MCP only for enrichment and evidence analysis.
3. Require structured model output before deterministic routing.
4. Use stable source IDs, claims, and dedupe keys.
5. Keep dry-run enabled until representative source, routing, and delivery tests pass.

## Purpose

Monitors newly closed deals during their first 90 days to detect accounts going dark before they become a retention problem. The workflow identifies recently closed-won accounts, checks Backstory engagement data for post-sale activity (meetings booked, emails exchanged, contacts engaged), and flags accounts with below-threshold engagement. An AI agent assesses each flagged account and recommends specific re-engagement actions. Alerts are sent to the CSM and sales handoff team via Messaging.
