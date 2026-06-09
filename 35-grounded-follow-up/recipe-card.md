# Content Generation — Grounded Follow-Up — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> resolve target -> gather context -> synthesize -> deliver`

## Production Implementation Notes

- Keep the draft grounded in specific activity and risk evidence rather than free-form personalization.
- Use one structured model pass to create the outbound draft after context collection is complete.
- Deliver the draft through Slack or a native messaging connector for human review before send.

## Shared Components To Recreate Outside n8n

- Request parser for the inbound trigger
- Backstory MCP context-gathering layer
- Structured prompt for the final synthesis step
- Native messaging delivery step

## Agent Boundary

Keep agentic behavior limited to the final summary, recommendation, or message-generation step. Lookup, routing, approval handling, and delivery should stay deterministic.

