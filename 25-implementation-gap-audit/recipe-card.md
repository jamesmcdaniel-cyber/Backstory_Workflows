# Implementation Gap Audit — Platform-Agnostic Recipe

> Rebuild this workflow on **any** orchestration platform to turn a customer request into a reusable productization scorecard instead of a one-off implementation plan.

## Prerequisites

- **Workflow request intake** — form, ticket, CRM note, or solutions brief
- **Library coverage inventory** — validated assets, recipe coverage, and generic-adapter notes
- **Scoring model** — implementation risk, customer demand, and repeatability value
- **Delivery destination** — Slack, Teams, email, Jira, Linear, or another backlog surface

## Architecture

```text
Webhook or Manual Intake -> Normalize Coverage Request -> Compare Against Library ->
Score Productization Gaps -> Recommend Backlog -> Deliver Audit
```

## Productization Template

Use this workflow in three layers so it scales beyond a single customer environment:

1. **Validated implementations in this repo** — start with the included n8n JSON or Claude/OpenAI workflow instructions when the customer stack matches a shipped asset.
2. **Deep recipes for common orchestrators** — use the rebuild steps below for Make, Power Automate, Zapier, Workato, or a similar orchestration tool.
3. **Generic adaptation path** — preserve the scoring model and only swap the intake connector plus the delivery surface.

### Coverage Levels

| Coverage level | Meaning | Action |
|---|---|---|
| Validated | shipped asset exists and is known-good | reuse immediately |
| Recipe-only | pattern is defined but connector work remains | estimate adapter effort |
| Generic-only | only high-level guidance exists | define canonical contract first |
| Missing | no reusable path exists | backlog as productization work |

## Step-by-Step Rebuild

### Step 1: Receive the Audit Request
- **What:** Capture the workflow goal and the customer’s actual stack.
- **Typical fields:** workflow family, orchestrator, CRM, meeting source, delivery surface, identity constraints

### Step 2: Normalize the Request
- **What:** Convert customer-specific language into a standard assessment object.
- **Why:** coverage scoring is only useful if every request is measured the same way

### Step 3: Compare Against the Library
- **What:** Check whether the library already has validated assets, deep recipes, or only generic guidance.
- **Best practice:** classify by system family, not only by whole workflow

### Step 4: Score the Remaining Gaps
- **What:** Prioritize missing adapters, contracts, and identity rules by repeatability and rollout risk.
- **Useful for:** product, solutions, and engineering alignment

### Step 5: Deliver the Backlog Recommendation
- **What:** Route the scorecard and next actions to the team that will decide build order.
- **Rule:** turn the audit into a reusable backlog, not a one-customer branch

## Sample Scorecard

```json
{
  "workflowPattern": "validated",
  "crmAdapter": "missing",
  "meetingSourceAdapter": "generic-only",
  "deliveryAdapter": "validated",
  "identityRules": "recipe-only"
}
```

## Estimated Build Time

| Platform | Estimated Time | Complexity |
|---|---:|---|
| n8n | 1-3 hours | Low |
| Make | 2-3 hours | Medium |
| Power Automate | 2-4 hours | Medium |
| Zapier | 2-3 hours | Medium |
| Custom code | 1-2 hours | Low |
