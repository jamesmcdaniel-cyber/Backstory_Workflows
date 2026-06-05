# Deal Hygiene Audit — Platform-Agnostic Recipe

> Rebuild this workflow on **any** automation platform (Make, Power Automate, Zapier, Workato, etc.)

## Prerequisites

- **Backstory API access** — REST API access or an MCP-to-REST bridge for enrichment calls
- **LLM API key** — Claude, OpenAI, Gemini, or another chat completion provider
- **CRM access** — Salesforce, Dynamics 365, HubSpot, or equivalent API credentials
- **Messaging credentials** — Slack Bot Token, Teams webhook, or SMTP for delivery

## Architecture

```
Schedule Trigger → Pull Open Pipeline → Check Deal Engagement → AI Hygiene Assessment → Deliver Action Lists
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
- **What:** Run on the same cadence as the catalog workflow: Schedule — Weekly Monday 7:30 AM.
- **Make:** Schedule module with the matching cron/cadence
- **Power Automate:** Recurrence trigger with the matching interval/time window
- **Zapier:** Schedule by Zapier with the nearest supported cadence
- **Implementation note:** Cron equivalent: `30 7 * * 1`.

### Step 2: Pull Open Pipeline
- **What:** Queries CRM for all open opportunities with their stages, close dates, and assigned reps.
- **API example:**
  ```text
  GET /opportunities/open?lookback_days=14
  ```
- **Make / Power Automate / Zapier:** Use the source system connector if one exists; otherwise use an HTTP request module/action.

### Step 3: Check Deal Engagement
- **What:** For each deal, pulls Backstory data on last activity date, contacts engaged, meeting recency, and email thread status.
- **API example:**
  ```text
  GET /opportunities/open?lookback_days=14
  ```
- **Make / Power Automate / Zapier:** Use the source system connector if one exists; otherwise use an HTTP request module/action.

### Step 4: AI Hygiene Assessment
- **What:** AI Agent identifies hygiene issues per deal (stale, single-threaded, no exec, past close date) and prioritizes by deal value and stage.
- **Prompting pattern:** Give the LLM the source record, Backstory context, and the expected output structure.
- **System prompt:**
  ```
  You are generating the Deal Hygiene Audit output.
  Purpose: Performs a weekly pipeline hygiene audit by scanning all open opportunities in the CRM and cross-referencing with Backstory engagement data. Flags deals with stale close dates, no recent activity, missing next steps, single-threaded contacts, or no executive engagement. An AI agent prioritizes the issues and generates a per-rep action list with specific cleanup tasks. Delivered to reps and their managers via Messaging every Monday morning.
  Use Backstory context plus the source payload to produce concise, actionable guidance.
  Return a channel-safe markdown or HTML summary with findings, risks, and next actions that can be delivered in Slack, Teams, or email.
  ```
- **All platforms:** Use your preferred LLM connector or raw HTTP requests to Claude/OpenAI/Gemini.

### Step 5: Deliver Action Lists
- **What:** Sends a per-rep cleanup checklist via Messaging, CC'ing their manager, with specific actions for each flagged deal.
- **Slack example:** `POST https://slack.com/api/chat.postMessage` with a channel ID and markdown text body
- **Teams / Email:** Use native message or SMTP actions if Slack is not your destination.

## MCP Gap Workaround

Most automation platforms do **not** speak MCP natively. Use one of these patterns:

1. **Backstory REST API directly** — best option if your tenant exposes the required endpoints.
2. **MCP-to-REST bridge** — lightweight proxy that translates HTTP requests into MCP tool calls.
3. **n8n as middleware** — let n8n handle the MCP calls, then expose results to your other platform by webhook.

## State and Deduplication

- Store the last processed deals IDs or timestamps so recurring runs do not resend the same insight.
- Keep thresholds and routing destinations in a config store instead of hardcoding them into the workflow logic.

## Estimated Build Time

| Platform        | Estimated Time | Complexity |
|-----------------|---------------|------------|
| Make | 3-4 hours | Medium |
| Power Automate | 4-5 hours | Medium-High |
| Zapier | 3-4 hours | Medium |
| Custom code | 2-3 hours | Medium |
| n8n (native) | 15 minutes | Low (import JSON) |
