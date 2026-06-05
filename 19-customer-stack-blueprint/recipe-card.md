# Customer Stack Blueprint — Platform-Agnostic Recipe

> Rebuild this workflow on **any** orchestration platform to turn customer stack requests into repeatable implementation blueprints.

## Prerequisites

- **Request intake source** — form, CRM record, ticket, or implementation request queue
- **Workflow library access** — validated n8n JSON, orchestrator instructions, and recipe-card references
- **LLM API key** — Claude, OpenAI, Gemini, or another chat completion provider
- **Optional config store** — Airtable, Sheets, Notion, or database for substitution rules and rollout defaults

## Architecture

```text
Webhook or Manual Intake -> Normalize Stack Request -> Match Validated Pattern ->
Blueprint Recommendation -> Deliver to Solutions / RevOps
```

## Productization Template

Use this workflow in three layers so it scales beyond a single customer environment:

1. **Validated implementations in this repo** — start with the included n8n JSON or Claude/OpenAI workflow instructions when the customer stack matches a shipped asset.
2. **Deep recipes for common orchestrators** — use the rebuild steps below for Make, Power Automate, Zapier, Workato, or a similar orchestration tool.
3. **Generic adaptation path** — preserve the workflow pattern and substitute equivalent connectors for customer-specific systems.

### Common System Substitutions

| Layer | Common choices | Adaptation guidance |
|---|---|---|
| CRM / system of record | Salesforce, Dynamics 365, HubSpot, custom CRM or warehouse | Swap the connector and field mapping, not the core workflow logic. |
| Delivery | Slack, Microsoft Teams, email, ticket queue | Keep the blueprint schema stable and only adapt the final formatting. |
| Notes / meetings / source systems | Google Calendar, Microsoft 365, Gong, Zoom, Otter, Fireflies, Fathom | Recommend the closest proven connector family, then normalize into shared intake fields. |
| Orchestration | n8n, Make, Power Automate, Zapier, Workato, custom code | Choose the deepest supported path first, then adapt the remaining wrapper steps. |

## Step-by-Step Rebuild

### Step 1: Capture the Customer Stack Request
- **What:** Accept a request describing the workflow goal and the customer’s current systems.
- **Fields to collect:** workflow goal, orchestrator, CRM, delivery surface, meeting/note source, identity source, constraints, security notes
- **Make / Power Automate / Zapier:** Intake via form, queue, ticket, or webhook trigger

### Step 2: Normalize the Intake
- **What:** Convert all requests into a canonical structure.
- **Canonical fields:** `workflowGoal`, `orchestrator`, `crm`, `delivery`, `meetingSource`, `storage`, `constraints`, `timeline`
- **Implementation note:** Store dropdown values for common platforms to reduce free-text variation.

### Step 3: Match the Closest Validated Starting Point
- **What:** Compare the request to the assets already proven in your library.
- **Logic examples:**
  - `orchestrator = n8n` -> start with workflow JSON
  - `orchestrator = Make / Power Automate / Zapier` -> start with recipe card
  - `crm = Dynamics` -> use the Dynamics substitution profile instead of Salesforce field names
  - `delivery = Teams` -> route output design to Teams-safe formatting

### Step 4: Generate the Blueprint
- **What:** Use the LLM to produce a build recommendation.
- **Required output:**
  - Best validated starting point
  - Required connector substitutions
  - Reusable core logic vs customer-specific wrappers
  - Gaps, blockers, and fallback options
  - First implementation milestones

### Step 5: Deliver the Plan
- **What:** Route the blueprint to the solutions engineer, RevOps owner, or delivery queue.
- **Common surfaces:** Slack, Teams, email, Notion, Jira, Linear, Asana

## Recommended Blueprint Output

```text
Customer Stack Blueprint

- Starting point: [Validated asset or recipe card]
- Orchestration path: [n8n / Make / Power Automate / Zapier / custom]
- CRM substitution: [Salesforce / Dynamics / HubSpot / custom]
- Delivery substitution: [Slack / Teams / Email / ticket queue]
- Meeting-source substitution: [Gong / Zoom / Otter / Fireflies / Fathom]
- Risks and gaps: [...]
- Milestones: [...]
```

## Estimated Build Time

| Platform | Estimated Time | Complexity |
|---|---:|---|
| n8n | 1-2 hours | Low |
| Make | 2-3 hours | Medium |
| Power Automate | 2-4 hours | Medium |
| Zapier | 2-3 hours | Medium |
| Custom code | 2-4 hours | Medium |
