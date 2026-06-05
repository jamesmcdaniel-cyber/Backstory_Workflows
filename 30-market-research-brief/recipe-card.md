# Market Research Brief — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> normalize -> source adapter -> enrich -> rank -> aggregate -> deliver`

## Production Implementation Notes

- Use a source adapter to emit one normalized `source_record` per target account containing recent news, leadership changes, funding signals, product launches, or competitor activity.
- Keep MCP bounded to account, opportunity, and engagement enrichment only.
- Require structured JSON from the model before the weekly digest is aggregated.
- Use native Slack and email connectors for the final delivery layer.

## Shared Components To Recreate Outside n8n

- Source adapter
- Market-intelligence ranking prompt
- Weekly digest formatter

## Agent Boundary

Keep agentic behavior limited to prioritization and synthesis. Research collection, ranking inputs, and delivery should stay deterministic.

