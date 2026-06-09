# Account Planning & Strategy — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> resolve target -> gather context -> synthesize -> deliver`

## Production Implementation Notes

- Use deterministic account lookups and MCP context gathering before any synthesis.
- Have the model return one concise strategic brief rather than free-form brainstorming.
- Deliver the final planning brief through a native Slack post or equivalent connector.

## Shared Components To Recreate Outside n8n

- Request parser for the inbound trigger
- Backstory MCP context-gathering layer
- Structured prompt for the final synthesis step
- Native messaging delivery step

## Agent Boundary

Keep agentic behavior limited to the final summary, recommendation, or message-generation step. Lookup, routing, approval handling, and delivery should stay deterministic.

