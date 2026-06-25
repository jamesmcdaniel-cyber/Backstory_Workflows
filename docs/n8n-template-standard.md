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

## External-use hardening (scripts/harden-external-templates.mjs)

Every template is post-processed for turnkey external-customer use. The harden
step runs last in the catalog build (after all generators and native-node
parity) and is idempotent:

- Native data sources: generic HTTP `Fetch Source Records` nodes that targeted
  fictional `crm/email/calendar` endpoints are replaced with real native nodes
  (Salesforce, HubSpot, Microsoft Outlook, Google Sheets) chosen per workflow,
  so a customer connects their actual system via OAuth with no middleware. The
  now-redundant Backstory auth-token fetch and its inline secret parameters are
  removed.
- Pre-wired credentials: every native node ships a named credential placeholder
  (`anthropicApi`, `httpMultipleHeadersAuth`, `slackOAuth2Api`, `smtp`,
  `salesforceOAuth2Api`, `microsoftOutlookOAuth2Api`, …) so the customer creates
  each credential once instead of wiring every node.
- Current model: the Anthropic chat model defaults to the current
  `claude-sonnet-4-6`.
- Demo-safe starters: `starter.json` swaps the live source for an offline
  fixture loader and flips test/dry-run flags, so a starter import produces
  immediate results with only an Anthropic credential connected.

A workflow may exceed the `<= 4` code-node limit only when it documents a
`Code-node budget: N` line in its `SOURCE.md`; the audit honors that allowance.

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
