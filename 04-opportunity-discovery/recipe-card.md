# Opportunity Discovery — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> normalize -> source adapter -> enrich -> score -> aggregate -> deliver`

## Production Implementation Notes

- Use a source adapter to return one normalized `source_record` per candidate account with no active open opportunity.
- Keep the enrichment step bounded to MCP or equivalent account-intelligence tools.
- Require structured JSON from the model before any aggregation or delivery.
- Use native Slack and email connectors for the final digest.

## Shared Components To Recreate Outside n8n

- Source adapter
- Candidate-account scoring prompt
- Weekly digest formatter

## Agent Boundary

Keep agentic behavior limited to buying-signal scoring and recommendation generation. Delivery, aggregation, and routing should stay deterministic.

