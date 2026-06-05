# Sales Digest — Platform-Agnostic Recipe

> Rebuild this workflow on **any** automation platform (Make, Power Automate, Zapier, Workato, etc.)

## Prerequisites

- **Backstory API access** — REST API or MCP-to-REST bridge
- **LLM API key** — Claude, OpenAI, or any chat completion endpoint
- **Messaging credentials** — Slack Bot Token, Teams Webhook, or SMTP
- **Subscriber store** — JSON file, Airtable, Google Sheets, or database

## Architecture

```
Schedule (6 AM weekdays) → Fetch Subscribers → Loop Each User →
  Gather Account Activity → AI Summarize → Deliver Digest
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
- **What:** Fire at 6:00 AM on weekdays only
- **Make:** Schedule module → 06:00, Monday–Friday
- **Power Automate:** Recurrence → 06:00 daily + Condition (day of week < 6)
- **Zapier:** Schedule by Zapier → every day at 6 AM + Filter (weekday only)

### Step 2: Fetch Subscriber List
- **What:** Read enrolled users from a config store
- **Data format:** `[{"name": "Sarah Chen", "slack_id": "U123", "accounts": ["ACME Corp", "Globex"]}]`
- **Make:** Google Sheets / Airtable module → read rows, or HTTP module → fetch JSON
- **Power Automate:** Get rows from Excel/SharePoint table, or HTTP GET from API
- **Zapier:** Google Sheets → Get Many Rows, or Airtable → Find Records

### Step 3: Loop Over Subscribers
- **What:** Process each subscriber individually
- **Make:** Iterator module on the subscriber array
- **Power Automate:** Apply to Each action
- **Zapier:** Looping by Zapier

### Step 4: Gather Account Activity
- **What:** For each subscriber's accounts, pull last 24 hours of activity from Backstory
- **API call:** For each account in user's list:
  `POST /api/v1/accounts/{name}/activity-summary`
  Body: `{ "lookback_hours": 24, "include": ["deals", "emails", "meetings", "contacts"] }`
- **All platforms:** HTTP request module, loop over user's account list

### Step 5: AI Summarization
- **What:** Send raw activity data to LLM for personalized digest
- **API call:** `POST https://api.anthropic.com/v1/messages`
- **System prompt:**
  ```
  You are a sales intelligence assistant generating a personalized daily
  digest. Given raw account activity, produce:
  - Greeting with rep name and date
  - PIPELINE MOVEMENT (3-5 bullets)
  - ENGAGEMENT HIGHLIGHTS (3-5 bullets)
  - RECOMMENDED ACTIONS (3-5 bullets)
  Use emoji headers. Be specific with names, amounts, dates.
  ```
- **User message:** Include rep name + all account activity data
- **Make:** HTTP module → POST to Anthropic/OpenAI
- **Power Automate:** HTTP action or AI Builder
- **Zapier:** OpenAI integration or HTTP request for Claude

### Step 6: Deliver Digest
- **What:** Send personalized digest to the subscriber
- **Slack DM:** `POST https://slack.com/api/chat.postMessage`
  Body: `{ "channel": "{user_slack_id}", "text": "{digest}" }`
- **Teams:** POST to user's 1:1 chat webhook
- **Email:** SMTP with HTML body
- **Make:** Slack → Send a Message module (channel = user's DM)
- **Power Automate:** Post Message in a Chat (Teams) or Send Email
- **Zapier:** Slack → Send Direct Message

## MCP Gap Workaround

See the Channel Pulse recipe card for MCP-to-REST bridge options. The same
approach applies here — deploy a lightweight proxy or use Backstory REST API
directly if available.

## Subscriber Store Options

| Store              | Best For           | Setup Time |
|--------------------|--------------------|------------|
| JSON file          | Prototyping        | 5 min      |
| Google Sheets      | Small teams        | 10 min     |
| Airtable           | Visual management  | 15 min     |
| Supabase/Postgres  | Production scale   | 30 min     |

## Estimated Build Time

| Platform        | Estimated Time | Complexity |
|-----------------|---------------|------------|
| Make            | 2-3 hours     | Medium     |
| Power Automate  | 3-4 hours     | Medium-High |
| Zapier          | 2-3 hours     | Medium     |
| Custom code     | 1-2 hours     | Low        |
| n8n (native)    | 15 minutes    | Low (import JSON) |
