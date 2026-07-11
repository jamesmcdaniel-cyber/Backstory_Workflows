# Meeting Brief — Platform-Agnostic Recipe

## Reference Architecture

`schedule -> upcoming-meeting source adapter -> Backstory enrichment -> structured brief -> identity resolution -> delivery renderer -> native delivery -> run summary`

## Production Implementation Notes

- Return one canonical meeting record per external meeting inside the configured window.
- Suppress stable meeting IDs that have already produced a brief.
- Keep Backstory MCP calls inside the bounded synthesis step.
- Require structured output before formatting or delivery.
- Resolve the meeting owner through shared identity configuration, never model output.
- Keep dry-run enabled until calendar, identity, and representative delivery tests pass.

## Agent Boundary

The agent identifies evidence, talking points, and risks. Calendar access, eligibility filtering, dedupe, recipient resolution, formatting, delivery, and observability are deterministic components.
