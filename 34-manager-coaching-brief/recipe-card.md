# Manager Coaching Brief — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> resolve target -> gather context -> synthesize -> deliver`

## Production Implementation Notes

- Treat scorecard and opportunity status as deterministic inputs to the brief.
- Reserve the model for the final coaching synthesis and action guidance.
- Deliver the completed coaching note through native Slack messaging.

## Shared Components To Recreate Outside n8n

- Request parser for the inbound trigger
- Backstory MCP context-gathering layer
- Structured prompt for the final synthesis step
- Native messaging delivery step

## Agent Boundary

Keep agentic behavior limited to the final summary, recommendation, or message-generation step. Lookup, routing, approval handling, and delivery should stay deterministic.

