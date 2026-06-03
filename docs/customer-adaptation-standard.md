# Customer Adaptation Standard

Use this standard when adapting a Backstory workflow for an external customer stack.

## Core Rule

Do not fork the workflow JSON to handle customer-specific systems unless the workflow pattern itself changes.

Adapt customer deployments through three productized layers:

1. Adapter packs
2. Typed customer stack config
3. Certification kits

## Adapter Packs

Adapter packs isolate vendor-specific implementation details so the workflow logic stays reusable.

Each pack should declare:

- system family such as `crm`, `delivery`, or `meeting_source`
- supported workflow IDs and workflow families
- required environment variables or connection references
- mapping files that translate source fields into canonical contracts
- golden fixtures with expected canonical output

Customer-specific substitutions should happen inside the pack artifacts, not inside the workflow template.

## Typed Customer Stack Config

Each customer rollout should start from a typed config manifest rather than direct edits to `full.json` or `starter.json`.

The manifest should capture:

- customer identity and owner
- selected workflow and orchestrator
- selected adapter packs by role
- environment bindings and secret ownership
- routing defaults and threshold overrides
- certification scenarios and approvers

This keeps adaptation reviewable, diffable, and reusable across environments.

## Certification Kits

Every supported adapter pack should ship with golden input and expected canonical output.

Certification should verify:

- the selected pack has the files it declares
- the expected output matches the canonical contracts
- the chosen customer config references real adapter packs
- the rollout includes scenario coverage before launch

## Recommended Customer Rollout Sequence

1. Start with the closest validated workflow asset.
2. Select adapter packs for CRM, delivery, meeting source, and any identity layer.
3. Fill a typed customer stack config manifest.
4. Run certification against the selected packs and config.
5. Only then wire the workflow into live connections and customer data.

## Repo Conventions

- `adapter-packs/`: vendor-specific pack definitions, mappings, and fixtures
- `schemas/`: typed schemas for adapter packs and customer config
- `templates/`: starter manifests for customer rollout and pack authoring
- `scripts/certify-adaptation-assets.mjs`: structural certification for packs and starter configs

The platform-enablement workflows in `19-28` should become the operational layer that consumes these assets during customer onboarding, QA, and launch readiness.
