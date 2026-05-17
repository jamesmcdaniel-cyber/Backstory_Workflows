# Channel Pulse — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> normalize -> source adapter -> enrich -> summarize -> route -> deliver`

## Production Implementation Notes

- Use one source adapter to emit normalized account-update candidates with route-channel metadata.
- Keep the LLM output structured and bounded to content synthesis only.
- Use a deterministic routing layer and native Slack connector for delivery.
- Split manual and scheduled entry points only at the trigger layer; the rest of the workflow should be shared.

## Shared Components To Recreate Outside n8n

- Source adapter
- Identity/channel resolver
- Delivery renderer

## Agent Boundary

Keep agentic behavior limited to generating the update body. Routing, payload shaping, and transport should stay deterministic.

