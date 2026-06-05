# Adapter Regression Monitor — Platform-Agnostic Recipe

> Rebuild this workflow on **any** orchestration platform to replay golden scenarios through reusable adapters and catch regressions before rollout.

## Prerequisites

- **Golden case registry** — canonical inputs and expected outputs for CRM, meeting, identity, or delivery adapters
- **Execution surface** — the adapters or transformation functions under test
- **Diff or contract store** — baseline output, accepted tolerance, and failure severity
- **Optional LLM API key** — for root-cause summaries and blast-radius notes

## Architecture

```text
QA Trigger -> Load Golden Scenarios -> Replay Adapter Cases ->
Compare to Expected Output -> Summarize Regressions -> Alert Owners
```

## Productization Template

Use this workflow in three layers so it scales beyond a single customer environment:

1. **Validated implementations in this repo** — start with the included n8n JSON or Claude/OpenAI workflow instructions when the adapter family matches a shipped test harness.
2. **Deep recipes for common orchestrators** — use the rebuild steps below for Make, Power Automate, Zapier, Workato, or a similar orchestration tool.
3. **Generic adaptation path** — keep the same golden cases, severity rules, and replay logic while swapping the execution and alerting connectors.

### Common Regression Types

| Adapter family | Example regression | Downstream risk |
|---|---|---|
| CRM | stage labels no longer map to canonical codes | workflow decisions drift silently |
| Meeting | action-item nesting changes | prep and coaching workflows miss owners |
| Identity | alias rules become more aggressive | people merge incorrectly across accounts |
| Delivery | mentions or card actions disappear | end users get incomplete output |

## Step-by-Step Rebuild

### Step 1: Start the QA Run
- **What:** Trigger a scheduled or release-gate regression run for one or more adapters.
- **Inputs:** adapter family, release version, scenarios to replay

### Step 2: Load Golden Scenarios
- **What:** Retrieve baseline inputs and expected outputs.
- **Rule:** use the same canonical cases across stacks so comparisons stay meaningful

### Step 3: Replay Adapter Cases
- **What:** Execute the adapters with the golden inputs and capture actual outputs.
- **Best practice:** store raw outputs for replay and investigation

### Step 4: Compare Results
- **What:** Diff actual output against the expected contract or golden snapshot.
- **Useful for:** blocking releases before behavior drifts into production

### Step 5: Deliver Findings
- **What:** Route regressions, blast radius, and replay priority to implementation owners.
- **Rule:** connect failure severity to release decisions, not just notifications

## Estimated Build Time

| Platform | Estimated Time | Complexity |
|---|---:|---|
| n8n | 1-3 hours | Low |
| Make | 2-4 hours | Medium |
| Power Automate | 2-4 hours | Medium |
| Zapier | 2-4 hours | Medium |
| Custom code | 1-3 hours | Low |
