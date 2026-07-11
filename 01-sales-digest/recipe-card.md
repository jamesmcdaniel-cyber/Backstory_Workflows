# Sales Digest — Platform-Agnostic Recipe

## Reference Architecture

`schedule -> run context -> source adapter -> Backstory enrichment -> structured digest -> identity resolution -> delivery renderer -> native delivery -> run summary`

## Production Implementation Notes

- Return one canonical subscriber packet per digest recipient.
- Keep Backstory MCP usage inside the bounded synthesis step.
- Require structured model output before formatting or delivery.
- Resolve recipients through shared identity configuration rather than prompt output.
- Keep dry-run on until representative source and routing tests pass.

## Agent Boundary

The agent prioritizes evidence and writes the digest. Source access, identity resolution, formatting, dedupe, delivery, and observability are deterministic components.
