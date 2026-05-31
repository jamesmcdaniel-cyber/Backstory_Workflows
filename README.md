# Backstory Automation Catalog

Static GitHub Pages SPA rebranded from the original `HappyCowboyAI/automation-catalog`.

## What This Repo Contains

- `index.html`: single-page app with hash routing
- `workflows.json`: catalog data for 29 workflows, including rollout metadata, platform status, and cross-tool productization patterns
- `01-*` through `29-*`: workflow assets and downloadable files used by the detail pages
- `shared-n8n/`: reusable n8n sub-workflow library for source access, routing, delivery rendering, calendar writing, and observability
- `skills/`: standalone Backstory LLM Skills SPA with 30 skills, including platform-architecture adapters for CRM, delivery, meeting sources, identity, payload contracts, migration planning, QA, and rollout readiness

The deployed site is static and serves directly from the repo root. When you regenerate workflow assets or rollout metadata, use the catalog build scripts below before publishing.

## Routes

- `#/`
- `#/about`
- `#/guides`
- `#/guides/cross-tool-templates`
- `#/guides/backstory-mcp`
- `#/guides/slack-bot-setup`
- `#/guides/teams-setup`
- `#/guides/google-chat-setup`
- `#/guides/email-setup`
- `#/workflow/<id>`
- `opp-insights-guide/#overview`
- `skills/#/`
- `skills/#/about`
- `skills/#/guides`
- `skills/#/skill/<id>`

Legacy links to `#/guides/peopleai-mcp` redirect to `#/guides/backstory-mcp`.

## Cross-Tool Template Strategy

The workflow library is structured in three layers so patterns can move from a
single implementation to a repeatable offering across customer environments:

1. Validated implementations: shipped assets like hardened `n8n` JSON templates and experimental agent SDK scripts.
2. Deep recipes for common orchestrators: Make, Power Automate, Zapier, and similar tools.
3. Generic adaptation guidance: connector substitution across CRM, delivery, meeting-note, and customer-specific systems.

The goal is to productize the reusable logic:

- prompts and scoring rules
- payload shapes between steps
- routing and escalation decisions
- configuration knobs such as lookback windows and thresholds

And keep vendor-specific layers thin:

- CRM connector implementations
- delivery-node implementations
- auth wrappers
- system-specific field mappings

The newest additions push that strategy into concrete assets:

- platform-enablement workflows for customer stack blueprinting, CRM normalization, meeting-source normalization, and multi-channel routing
- platform-architecture skills for workflow templating, CRM mapping, delivery adaptation, and meeting-source adaptation
- platform-enablement workflows for identity resolution, payload-contract validation, and implementation gap auditing
- platform-architecture skills for identity resolution, payload contract design, and productization gap analysis
- platform-enablement workflows for orchestrator migration, adapter regression monitoring, and rollout readiness scoring
- platform-architecture skills for orchestrator migration planning, adapter QA strategy, and launch readiness assessment

## Template Tiers

The catalog now distinguishes between two n8n artifacts and surfaces rollout status per platform:

- `full.json`: public, pilot, or legacy n8n template depending on the workflow’s rollout status
- `starter.json`: demo-safe import intended for sandbox runs and guided adaptation

Shared contract definitions live in [docs/workflow-contracts.md](docs/workflow-contracts.md) and the n8n packaging rules live in [docs/n8n-template-standard.md](docs/n8n-template-standard.md).
Cross-platform native-first standards for Workato and Zapier live in [docs/workato-zapier-native-template-standard.md](docs/workato-zapier-native-template-standard.md).

Reusable n8n building blocks live under `shared-n8n/` and are intended to be wired into production templates with `Execute Sub-workflow`.

Reference cross-platform implementation guides can also be attached per workflow as:

- `workato-guide.pdf`
- `zapier-guide.pdf`

The Markdown guide sources remain in-repo for regeneration, but the public catalog serves branded PDFs.

## Local Preview

Because the SPA fetches `workflows.json`, serve the repo over HTTP instead of opening `index.html` directly from `file://`.

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/#/
```

The LLM skills companion page is available at:

```text
http://localhost:8000/skills/#/
```

## Regenerating Assets

Install the local tooling once:

```bash
npm install
npx playwright install chromium
```

Then rebuild the catalog, rollout metadata, and branded Workato/Zapier PDFs:

```bash
npm run build:catalog
```

## GitHub Pages Deployment

1. Push this repo to GitHub.
2. Open the repository settings in GitHub.
3. Go to `Settings` -> `Pages`.
4. Under `Build and deployment`, set:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/ (root)`
5. Save.
6. Wait a minute or two for GitHub Pages to publish.

Your site will be available at:

```text
https://<username-or-org>.github.io/<repo-name>/
```

## Notes

- GitHub Pages remains a static deploy target; the build scripts only regenerate committed assets like `workflows.json` and PDF guides.
- Download links on workflow detail pages resolve to files in this repo, not the upstream source repo.
- The production MCP endpoint remains `https://mcp.people.ai/mcp`.
- The Backstory n8n instance referenced in the guides is `https://n8n-pg.peoplesync.ai`.

## Maintenance

Catalog and rollout maintenance scripts:

```bash
node scripts/build-catalog.mjs
node scripts/convert-slack-http-to-native.mjs
node scripts/audit-workflow-catalog.mjs
node scripts/smoke-site-assets.mjs
node scripts/smoke-public-n8n.mjs
```

- `build-catalog.mjs` regenerates workflow assets, rollout metadata, and branded Workato/Zapier PDF guides
- `convert-slack-http-to-native.mjs` upgrades raw Slack delivery nodes to the native Slack node
- `audit-workflow-catalog.mjs` scans `full.json` assets for hardcoded secrets, native-node violations, placeholder production config, missing PDFs, and rollout metadata drift
- `smoke-site-assets.mjs` verifies the UI renders rollout badges and PDF download links correctly
- `smoke-public-n8n.mjs` validates Dockerized n8n imports for the public workflow subset
