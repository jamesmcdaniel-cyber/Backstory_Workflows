# Marketing-to-Sales Handoff Scorer — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> canonical source adapter -> Backstory enrichment -> structured analysis -> identity resolution -> delivery renderer -> native delivery -> run summary`

## Implementation Rules

1. Normalize connector-specific data into one canonical source record.
2. Use Backstory MCP only for enrichment and evidence analysis.
3. Require structured model output before deterministic routing.
4. Use stable source IDs, claims, and dedupe keys.
5. Keep dry-run enabled until representative source, routing, and delivery tests pass.

## Purpose

Enriches marketing-qualified leads at the moment of handoff by checking Backstory for existing engagement history. When a new MQL is created in the CRM or marketing automation platform, the workflow queries Backstory to see if the account already has relationship history — prior meetings, email threads, known contacts, or past opportunities. An AI agent scores the handoff quality (hot / warm / cold) and generates a context brief for the receiving SDR or AE, so they never walk into a "cold" call that's actually warm. Delivered instantly via Messaging.
