# Migration Backlog

Current rollout gate after the public-rollout hardening pass:

## Public n8n release set

- `01-sales-digest`
- `02-meeting-brief`
- `04-opportunity-discovery`
- `05-forecast-coach`
- `18-channel-pulse`
- `29-digital-chief-of-staff`

These are the only workflows that should currently be presented as public-ready n8n templates.

## Pilot n8n set

- `19-customer-stack-blueprint`
- `20-crm-signal-normalizer`
- `21-meeting-intelligence-normalizer`
- `22-multi-channel-delivery-router`
- `23-identity-resolution-hub`
- `24-workflow-contract-validator`
- `25-implementation-gap-audit`
- `26-orchestrator-migration-planner`
- `27-adapter-regression-monitor`
- `28-rollout-readiness-scorecard`
- `30-market-research-brief`

Shared remaining gaps for this pilot tier:

- full and starter variants still need stronger separation
- source and sink connectors remain customer-specific reference patterns
- public rollout should stay gated until those templates are hardened further

## Legacy n8n backlog

- `03-silence-contract-monitor`
- `06-executive-inbox`
- `07-churn-risk-scorecard`
- `08-renewal-prep-brief`
- `09-onboarding-pulse`
- `10-activity-gap-detector`
- `11-deal-hygiene-audit`
- `12-win-loss-debrief`
- `13-competitive-displacement-alert`
- `14-territory-heat-map`
- `15-qbr-auto-prep`
- `16-executive-sponsor-tracker`
- `17-marketing-sales-handoff-scorer`

Shared remaining gaps for this legacy tier:

- inline HTTP and normalization logic still need migration onto shared adapters
- env-backed production config is not consistent enough yet
- many `full.json` assets still retain starter-era lineage and should not be treated as public templates

## Next migration batch

1. `06-executive-inbox`
2. `07-churn-risk-scorecard`

These are the highest-value remaining legacy workflows to migrate next because they are core catalog patterns that still need the shared-adapter and env-backed production treatment. Sales Digest and Meeting Brief completed this migration in the preceding parity slices.
