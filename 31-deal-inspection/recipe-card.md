# Deal Inspection (Slack /dealcheck) — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> resolve target -> gather context -> synthesize -> deliver`

## Production Implementation Notes

- Use a Slack slash command or webhook trigger to collect the account or opportunity hint.
- Keep MCP limited to context gathering and let the model synthesize only the final inspection summary.
- Use a native Slack post for the response rather than routing delivery through raw HTTP calls.

## Shared Components To Recreate Outside n8n

- Request parser for the inbound trigger
- Backstory MCP context-gathering layer
- Structured prompt for the final synthesis step
- Native messaging delivery step

## Agent Boundary

Keep agentic behavior limited to the final summary, recommendation, or message-generation step. Lookup, routing, approval handling, and delivery should stay deterministic.

