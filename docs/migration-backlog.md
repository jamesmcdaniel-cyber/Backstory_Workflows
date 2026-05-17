# Migration Backlog

Current audit baseline after the contract, metadata, and Slack-delivery upgrades:

## Remaining legacy workflows

- `04-opportunity-discovery`
  - still uses 15 code nodes
  - should be split into shared source, analysis, and delivery sub-workflows before it can meet the standard code-node ceiling
- `05-forecast-coach`
  - still uses 7 code nodes
  - should move HTML rendering and prioritization logic into shared deterministic components
- `18-channel-pulse`
  - still uses 8 code nodes
  - still calls Slack channel and user listing via raw HTTP
  - is the next best candidate for full migration because it is the closest legacy relative of the new DCOS reference workflow

## Recommended next batch order

1. `18-channel-pulse`
2. `05-forecast-coach`
3. `04-opportunity-discovery`

These are the only workflows still failing the current production audit after the catalog-wide delivery migration.
