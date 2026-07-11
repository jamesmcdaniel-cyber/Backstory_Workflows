# Executive Inbox — Platform-Agnostic Recipe

## Reference Architecture

`schedule -> leased external-message source -> Backstory enrichment -> structured triage -> deterministic urgency route -> delivery renderer -> native notification -> run summary`

## Production Implementation Notes

- Atomically lease unread external messages by stable ID to prevent duplicate alerts.
- Expire abandoned leases so failed runs can retry safely.
- Keep Backstory MCP calls inside the bounded classification step.
- Require structured urgency/category output before routing.
- Map urgency to configured destinations outside the model.
- Suppress informational notifications while retaining observability.
- Keep dry-run enabled until inbox, routing, and representative delivery tests pass.

## Agent Boundary

The agent classifies evidence and recommends an action. Mailbox access, leasing, dedupe, channel selection, notification eligibility, formatting, delivery, and observability are deterministic components.
