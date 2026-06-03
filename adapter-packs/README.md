# Adapter Packs

Adapter packs isolate the parts of a workflow that vary by customer stack.

Use packs to contain:

- CRM field mappings
- delivery routing defaults
- meeting-source normalization rules
- system-specific environment requirements
- golden fixtures used during certification

## Directory Convention

```text
adapter-packs/
  <family>/
    <pack-name>/
      manifest.json
      <mapping files>
      fixtures/
        <input>.json
        <expected>.json
```

## How To Use

1. Pick the closest validated workflow asset.
2. Select one pack per system role in a customer stack config manifest.
3. Fill customer-specific env bindings and routing defaults in `templates/customer-stack-config*.json`.
4. Run `npm run certify:adaptation` before promoting the customer rollout.

## Current Example Packs

- `crm/salesforce-opportunity-signals`
- `delivery/slack-account-routing`
- `meeting_source/gong-meeting-intelligence`

These are starter-quality reference packs intended to establish the structure for external-customer adaptation without requiring direct workflow JSON edits.
