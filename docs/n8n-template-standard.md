# n8n Template Standard

Use this standard when promoting a workflow from demo-safe starter to production-ready template.

## Production quality gates

- No hardcoded secrets, bearer tokens, user IDs, or channel IDs in `full.json`
- No canned business records on the production execution path
- No raw HTTP calls to Slack, Google Calendar, Teams, or email when a native node exists
- Code nodes only for irreducible normalization or parsing
- Standard target: `<= 4` code nodes per workflow unless documented in `SOURCE.md`
- Agents return structured JSON, not transport-ready side effects
- MCP nodes are limited to enrichment and synthesis steps

## Packaging rules

- `full.json`: production-ready template
- `starter.json`: safe demo import with sandbox defaults or fixtures
- Shared logic should move to importable sub-workflows whenever the same behavior appears in two or more workflows
- Customer-specific substitutions should happen through typed customer config manifests and adapter packs, not by editing workflow JSON directly
- Public template families should ship with certification fixtures for every supported adapter pack

## Shared sub-workflows

The library now reserves these reusable components:

- Source adapter
- Backstory enrichment
- Identity and channel resolution
- Delivery renderer
- Calendar and task writer
- Run summary and observability

## Cross-tool portability rule

Preserve the canonical contracts and workflow sequence:

`trigger -> normalize -> source adapter -> enrich -> analyze -> route -> deliver -> summarize`

Only the connector wrappers should vary by orchestrator or customer stack.
