# AI Agents — Deal Risk + Next Actions — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> resolve target -> gather context -> synthesize -> deliver`

## Production Implementation Notes

- Treat status, activity, and stakeholder data as separate deterministic inputs.
- Use the model only for the final deal-risk synthesis and action guidance.
- Return the finished brief through native Slack delivery.

## Shared Components To Recreate Outside n8n

- Request parser for the inbound trigger
- Backstory MCP context-gathering layer
- Structured prompt for the final synthesis step
- Native messaging delivery step

## Agent Boundary

Keep agentic behavior limited to the final summary, recommendation, or message-generation step. Lookup, routing, approval handling, and delivery should stay deterministic.

