# Orchestrator Migration Planner — Platform-Agnostic Recipe

> Rebuild this workflow on **any** orchestration platform to move a proven workflow pattern from one orchestrator to another without breaking behavior.

## Prerequisites

- **Source implementation reference** — current n8n, Make, Power Automate, Zapier, Workato, or code flow
- **Target orchestrator constraints** — available nodes, auth model, retry policy, batching limits, and scheduling model
- **Canonical payload contract** — the workflow boundary definitions that must survive migration
- **Optional LLM API key** — for step-equivalent mapping and cutover guidance

## Architecture

```text
Migration Intake -> Normalize Source and Target -> Map Step Equivalents ->
Assess State / Retry Risks -> Build Cutover Plan -> Deliver Migration Blueprint
```

## Productization Template

Use this workflow in three layers so it scales beyond a single customer environment:

1. **Validated implementations in this repo** — start with the included n8n JSON or agent-script variants when the source or target stack already has a shipped asset.
2. **Deep recipes for common orchestrators** — use the rebuild steps below for Make, Power Automate, Zapier, Workato, or a similar orchestration tool.
3. **Generic adaptation path** — preserve workflow order, payload contracts, auth assumptions, and retry behavior while swapping platform-specific steps.

### Common Migration Risks

| Layer | Example difference | Why it matters |
|---|---|---|
| Triggering | webhook vs polling vs native schedule | affects timeliness and replay behavior |
| State | loop variables, batch cursors, sub-workflow output | changes whether retries are safe |
| Auth | platform credential stores and secret rotation | often blocks parity at cutover time |
| Delivery | Slack/Teams/email node capability differences | can change final output behavior even when the business logic is the same |

## Step-by-Step Rebuild

### Step 1: Capture the Migration Request
- **What:** Gather the workflow family, the current orchestrator, the target orchestrator, and cutover constraints.
- **Typical fields:** source tool, target tool, trigger type, stateful steps, auth dependencies, delivery surfaces

### Step 2: Normalize the Workflow Shape
- **What:** Convert the source implementation into a tool-neutral sequence.
- **Rule:** think in workflow boundaries and step purposes, not product-specific node names

### Step 3: Map Equivalents
- **What:** Find target-platform replacements for triggers, transforms, batching, queueing, auth, and delivery.
- **Best practice:** keep the canonical payload contract unchanged whenever possible

### Step 4: Assess Risk
- **What:** Identify differences in retries, batching, schedules, webhook responses, and error handling.
- **Useful for:** deciding between phased dual-run, direct cutover, or contract-first rebuild

### Step 5: Publish the Cutover Plan
- **What:** Deliver a migration blueprint with test cases, rollback checkpoints, and phased rollout steps.
- **Rule:** treat migration as a productized change, not a one-time rewrite

## Estimated Build Time

| Platform | Estimated Time | Complexity |
|---|---:|---|
| n8n | 1-3 hours | Low |
| Make | 2-4 hours | Medium |
| Power Automate | 2-5 hours | Medium |
| Zapier | 2-4 hours | Medium |
| Custom code | 1-3 hours | Low |
