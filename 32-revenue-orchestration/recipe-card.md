# Revenue Orchestration (Approval-Gated) — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> resolve target -> gather context -> synthesize -> deliver`

## Production Implementation Notes

- Use a webhook trigger for the inbound signal and acknowledge immediately.
- Generate structured proposal JSON before composing the approval blocks.
- Keep the wait/resume approval path deterministic and driven by native Slack actions or resume URLs.

## Shared Components To Recreate Outside n8n

- Request parser for the inbound trigger
- Backstory MCP context-gathering layer
- Structured prompt for the final synthesis step
- Native messaging delivery step

## Agent Boundary

Keep agentic behavior limited to the final summary, recommendation, or message-generation step. Lookup, routing, approval handling, and delivery should stay deterministic.

