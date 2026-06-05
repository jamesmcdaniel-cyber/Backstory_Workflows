# Silence & Contract Monitor — Platform-Agnostic Recipe

> Rebuild this workflow on **any** automation platform (Make, Power Automate, Zapier, Workato, etc.)

## Prerequisites

- **Backstory API access** — REST API or MCP-to-REST bridge
- **LLM API key** — Claude, OpenAI, or any chat completion endpoint
- **Messaging credentials** — Slack Bot Token, Teams Webhook, or SMTP
- **Account metadata store** — Contract dates, normal cadence baselines

## Architecture

```
Schedule (6:30 AM daily) → Fetch Accounts → Check Engagement Gaps →
  AI Risk Assessment → Filter by Severity → Deliver Alerts
```

## Productization Template

Use this workflow in three layers so it scales beyond a single customer environment:

1. **Validated implementations in this repo** — start with the included n8n JSON or Claude/OpenAI workflow instructions when the customer stack matches a shipped asset.
2. **Deep recipes for common orchestrators** — use the rebuild steps below for Make, Power Automate, Zapier, Workato, or a similar orchestration tool.
3. **Generic adaptation path** — preserve the workflow pattern and substitute equivalent connectors for customer-specific systems.

### Common System Substitutions

| Layer | Common choices | Adaptation guidance |
|---|---|---|
| CRM / system of record | Salesforce, Dynamics 365, HubSpot, custom CRM or warehouse | Replace record fetch and write-back steps with equivalent account, contact, opportunity, and activity queries. |
| Delivery | Slack, Microsoft Teams, email, ticket queue | Keep the message schema and routing logic the same; only replace the final delivery action. |
| Notes / meetings / source systems | Google Calendar, Microsoft 365, Gong, Zoom, Otter, Fireflies, Fathom | Use the system that owns the meeting, transcript, or event data, then normalize it into the same enrichment payload. |
| Orchestration | n8n, Make, Power Automate, Zapier, Workato, custom code | Preserve the trigger -> gather -> enrich -> analyze -> route -> deliver pattern even if the tool names change. |

### Implementation Guidance

- Prioritize the most common customer stacks first, then adapt this recipe for less common tools.
- Start from a validated workflow when possible, then swap only the CRM, delivery, and source-system connectors.
- Keep prompts, scoring logic, and routing rules productized; treat vendor-specific connector steps as thin wrappers.

## Step-by-Step Rebuild

### Step 1: Schedule Trigger
- **What:** Fire at 6:30 AM daily
- **Make:** Schedule module → 06:30, every day
- **Power Automate:** Recurrence → daily at 06:30
- **Zapier:** Schedule by Zapier → every day at 6:30 AM

### Step 2: Fetch Monitored Accounts
- **What:** Get all accounts with their engagement data and contract dates
- **API call:** Query Backstory for accounts with last engagement timestamps
  `POST /api/v1/accounts/engagement-summary`
  Body: `{ "include": ["last_activity_date", "normal_cadence", "contract_dates", "deal_info"] }`
- **All platforms:** HTTP request module to Backstory REST API

### Step 3: Detect Silent Accounts
- **What:** Filter accounts where days since last engagement exceeds threshold
- **Logic:**
  ```
  days_silent = today - last_engagement_date
  if days_silent > threshold (default 7 days):
      flag as silent
  ```
- **Make:** Filter module or Code module (JavaScript)
- **Power Automate:** Filter array action + Compose for date math
- **Zapier:** Filter by Zapier or Code by Zapier (Python/JS)

### Step 4: AI Risk Assessment
- **What:** For each silent account, assess severity using LLM
- **API call:** `POST https://api.anthropic.com/v1/messages`
- **System prompt:**
  ```
  You are a sales intelligence assistant assessing churn risk from
  account silence. For each silent account, determine:
  - Severity: Critical (🔴), Watch (🟡), or Benign (🟢)
  - Context: how silence compares to normal cadence
  - Contract/renewal urgency
  - Whether silence is explainable (PTO, holidays, post-close)
  - Recommended re-engagement action
  Be specific with days, dates, dollar amounts.
  ```
- **Make:** HTTP module → POST to Anthropic/OpenAI
- **Power Automate:** HTTP action or AI Builder
- **Zapier:** OpenAI integration or HTTP request

### Step 5: Filter by Severity
- **What:** Only alert on Critical and Watch accounts, skip Benign
- **Make:** Router module splitting on severity field
- **Power Automate:** Condition action checking severity
- **Zapier:** Filter by Zapier

### Step 6: Deliver Alerts
- **What:** Post consolidated alert to team channel
- **Slack:** `POST https://slack.com/api/chat.postMessage` with formatted blocks
- **Teams:** POST to channel webhook with adaptive card
- **Email:** SMTP with HTML table of flagged accounts
- **Make:** Slack → Send a Message / Microsoft Teams → Send a Message
- **Power Automate:** Post Message in a Chat (Teams) or Send Email
- **Zapier:** Slack → Send Channel Message

## MCP Gap Workaround

See the Channel Pulse recipe card for MCP-to-REST bridge options. The same
approach applies — deploy a lightweight proxy or use Backstory REST API directly.

## Cadence Baseline

To detect "abnormal" silence, you need a baseline of normal engagement cadence per account:

| Approach           | Best For           | Complexity |
|--------------------|--------------------|------------|
| Fixed threshold    | Quick start        | Low — same days for all accounts |
| Per-account config | Accuracy           | Medium — store in spreadsheet/DB |
| AI-calculated      | Self-tuning        | High — LLM analyzes historical patterns |

## Estimated Build Time

| Platform        | Estimated Time | Complexity |
|-----------------|---------------|------------|
| Make            | 3-4 hours     | Medium-High |
| Power Automate  | 4-5 hours     | High       |
| Zapier          | 3-4 hours     | Medium-High |
| Custom code     | 2-3 hours     | Medium     |
| n8n (native)    | 15 minutes    | Low (import JSON) |
