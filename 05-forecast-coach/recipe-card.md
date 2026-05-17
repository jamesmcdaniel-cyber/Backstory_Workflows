# Forecast Coach — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> normalize -> source adapter -> enrich -> coach -> deliver`

## Production Implementation Notes

- Use a source adapter to emit one leader-scoped `source_record` containing the open pipeline, coverage details, and stage risk metadata.
- Keep deal-health synthesis bounded to one structured AI output step.
- Send native email directly from the structured result instead of formatting with loop-heavy custom code.

## Shared Components To Recreate Outside n8n

- Source adapter
- Leader coaching prompt
- Email renderer

## Agent Boundary

Keep agentic behavior limited to coaching synthesis and risk framing. Team expansion, routing, and delivery should stay deterministic.

