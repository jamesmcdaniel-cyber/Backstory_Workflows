# Prospecting Brief — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> resolve target -> gather context -> synthesize -> deliver`

## Production Implementation Notes

- Keep the account resolver deterministic and use MCP only for context collection.
- Have the model produce one short prospecting brief instead of multiple delivery payloads.
- Return the final brief through a native Slack post or equivalent messaging connector.

## Shared Components To Recreate Outside n8n

- Request parser for the inbound trigger
- Backstory MCP context-gathering layer
- Structured prompt for the final synthesis step
- Native messaging delivery step

## Agent Boundary

Keep agentic behavior limited to the final summary, recommendation, or message-generation step. Lookup, routing, approval handling, and delivery should stay deterministic.

