# Competitive Displacement Alert — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> canonical source adapter -> Backstory enrichment -> structured analysis -> identity resolution -> delivery renderer -> native delivery -> run summary`

## Implementation Rules

1. Normalize connector-specific data into one canonical source record.
2. Use Backstory MCP only for enrichment and evidence analysis.
3. Require structured model output before deterministic routing.
4. Use stable source IDs, claims, and dedupe keys.
5. Keep dry-run enabled until representative source, routing, and delivery tests pass.

## Purpose

Monitors customer accounts for early signs of competitive displacement. The workflow scans Backstory engagement data for accounts where internal engagement has suddenly dropped while simultaneously checking for competitor mentions in email subjects, meeting titles, or CRM notes. An AI agent evaluates the combined signals to assess displacement risk and recommends defensive actions. High-risk alerts are sent immediately to the account owner and their manager via Messaging.
