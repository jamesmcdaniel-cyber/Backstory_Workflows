# Rollout Readiness Scorecard — Platform-Agnostic Recipe

> Rebuild this workflow on **any** orchestration platform to decide whether a customer stack is actually ready for pilot or launch.

## Prerequisites

- **Readiness intake** — customer stack details, workflow family, launch timeline, and known blockers
- **Workflow requirement inventory** — connectors, identity assumptions, delivery routes, ownership, security, and QA needs
- **Scoring model** — readiness dimensions plus launch and pilot thresholds
- **Optional LLM API key** — for human-readable launch recommendations and mitigation notes

## Architecture

```text
Readiness Intake -> Normalize Prerequisites -> Score Readiness Dimensions ->
Recommend Go / Pilot / Block -> Deliver Scorecard -> Track Launch Follow-Up
```

## Productization Template

Use this workflow in three layers so it scales beyond a single customer environment:

1. **Validated implementations in this repo** — start with the included n8n JSON or agent-script variants when the readiness gate matches a shipped workflow family.
2. **Deep recipes for common orchestrators** — use the rebuild steps below for Make, Power Automate, Zapier, Workato, or a similar orchestration tool.
3. **Generic adaptation path** — preserve the readiness dimensions, thresholds, and mitigation logic while swapping the intake and delivery connectors.

### Common Readiness Dimensions

| Dimension | What good looks like | Typical blocker |
|---|---|---|
| Connector access | data and delivery connectors authenticated | missing tenant or API approval |
| Mapping quality | canonical CRM and meeting fields are stable | stage, owner, or account joins incomplete |
| Identity | people and channel identities resolve cleanly | aliases and subsidiaries unresolved |
| QA | golden cases or parity checks are available | release path has no regression gate |
| Ownership | someone owns launch, alerts, and fixes | support path undefined |
| Security | secrets, approvals, and data handling are documented | production secret plan missing |

## Step-by-Step Rebuild

### Step 1: Capture the Launch Request
- **What:** Gather the workflow family, customer stack, launch date, and known blockers.
- **Typical fields:** CRM, meeting source, delivery surface, identity layer, operational owner, security status

### Step 2: Normalize the Prerequisites
- **What:** Convert the raw stack information into the readiness dimensions you score consistently.
- **Rule:** keep pilot and launch thresholds explicit

### Step 3: Score the Dimensions
- **What:** Assess connectors, mapping, identity, QA, ownership, and security.
- **Best practice:** treat hard blockers separately from soft launch risks

### Step 4: Build the Launch Recommendation
- **What:** Translate the scores into a go, pilot, or block recommendation with mitigations.
- **Useful for:** implementation governance and stakeholder expectation-setting

### Step 5: Deliver the Scorecard
- **What:** Route the readiness summary and next steps to the implementation owners.
- **Rule:** use the scorecard to prevent premature rollout, not to justify it

## Estimated Build Time

| Platform | Estimated Time | Complexity |
|---|---:|---|
| n8n | 1-3 hours | Low |
| Make | 2-3 hours | Medium |
| Power Automate | 2-4 hours | Medium |
| Zapier | 2-3 hours | Medium |
| Custom code | 1-2 hours | Low |
