# Migration Backlog

Current rollout gate after the shared-contract parity program:

## Public n8n release set

- `01-sales-digest`
- `02-meeting-brief`
- `03-silence-contract-monitor`
- `04-opportunity-discovery`
- `05-forecast-coach`
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
- `18-channel-pulse`
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
- `29-digital-chief-of-staff`
- `30-market-research-brief`
- `31-deal-inspection`
- `32-revenue-orchestration`
- `33-prospecting-brief`
- `34-manager-coaching-brief`
- `35-grounded-follow-up`
- `36-pipeline-forecast-digest`
- `37-deal-risk-next-actions`
- `38-account-planning-strategy`

Every listed full template is inactive by default and has a distinct dry-run-safe starter. Revenue workflows use env-backed shared source, identity, delivery-renderer, and observability contracts. Adapter and contract utilities use env-backed connector configuration, named HTTP credentials, deterministic delivery gates, and starters with external HTTP disabled or replaced by fixtures.

## Remaining legacy n8n backlog

None.

## Remaining pilot n8n backlog

None.

## Ongoing release gate

Public status means the repository asset satisfies static structure, safety, shared-contract, and starter-separation certification. Generated or customized artifacts still require a representative sandbox execution receipt before the product enables download. Live rollout additionally requires customer credentials, destinations, and adapter certification for the selected stack.
