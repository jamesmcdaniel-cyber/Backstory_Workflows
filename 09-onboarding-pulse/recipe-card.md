# Onboarding Pulse — Platform-Agnostic Recipe

> Rebuild this workflow on **any** automation platform (Make, Power Automate, Zapier, Workato, etc.)

## Prerequisites

- **Backstory API access** — REST API access or an MCP-to-REST bridge for enrichment calls
- **LLM API key** — Claude, OpenAI, Gemini, or another chat completion provider
- **CRM access** — Salesforce, Dynamics 365, HubSpot, or equivalent API credentials
- **Messaging credentials** — Slack Bot Token, Teams webhook, or SMTP for delivery

## Architecture

```
Schedule Trigger → Find New Customers → Check Post-Sale Engagement → AI Engagement Assessment → Alert on Silent Accounts
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
- **What:** Run on the same cadence as the catalog workflow: Schedule — Daily 8:00 AM.
- **Make:** Schedule module with the matching cron/cadence
- **Power Automate:** Recurrence trigger with the matching interval/time window
- **Zapier:** Schedule by Zapier with the nearest supported cadence
- **Implementation note:** Cron equivalent: `0 8 * * *`.

### Step 2: Find New Customers
- **What:** Queries CRM for accounts closed-won in the last 90 days.
- **API example:**
  ```text
  GET /accounts/new-customers?lookback_days=90
  ```
- **Make / Power Automate / Zapier:** Use the source system connector if one exists; otherwise use an HTTP request module/action.

### Step 3: Check Post-Sale Engagement
- **What:** For each account, pulls Backstory data on meetings, emails, and contact engagement since close date.
- **API example:**
  ```text
  GET /accounts/new-customers?lookback_days=90
  ```
- **Make / Power Automate / Zapier:** Use the source system connector if one exists; otherwise use an HTTP request module/action.

### Step 4: AI Engagement Assessment
- **What:** AI Agent evaluates whether engagement is on track, at risk, or dark. Generates re-engagement recommendations for at-risk accounts.
- **Prompting pattern:** Give the LLM the source record, Backstory context, and the expected output structure.
- **System prompt:**
  ```
  You are generating the Onboarding Pulse output.
  Purpose: Monitors newly closed deals during their first 90 days to detect accounts going dark before they become a retention problem. The workflow identifies recently closed-won accounts, checks Backstory engagement data for post-sale activity (meetings booked, emails exchanged, contacts engaged), and flags accounts with below-threshold engagement. An AI agent assesses each flagged account and recommends specific re-engagement actions. Alerts are sent to the CSM and sales handoff team via Messaging.
  Use Backstory context plus the source payload to produce concise, actionable guidance.
  Return a channel-safe markdown or HTML summary with findings, risks, and next actions that can be delivered in Slack, Teams, or email.
  ```
- **All platforms:** Use your preferred LLM connector or raw HTTP requests to Claude/OpenAI/Gemini.

### Step 5: Alert on Silent Accounts
- **What:** Sends alerts to the CSM for accounts flagged as at-risk or dark, with specific recommended next steps.
- **Slack example:** `POST https://slack.com/api/chat.postMessage` with a channel ID and markdown text body
- **Teams / Email:** Use native message or SMTP actions if Slack is not your destination.

## MCP Gap Workaround

Most automation platforms do **not** speak MCP natively. Use one of these patterns:

1. **Backstory REST API directly** — best option if your tenant exposes the required endpoints.
2. **MCP-to-REST bridge** — lightweight proxy that translates HTTP requests into MCP tool calls.
3. **n8n as middleware** — let n8n handle the MCP calls, then expose results to your other platform by webhook.

## State and Deduplication

- Store the last processed accounts IDs or timestamps so recurring runs do not resend the same insight.
- Keep thresholds and routing destinations in a config store instead of hardcoding them into the workflow logic.

## Estimated Build Time

| Platform        | Estimated Time | Complexity |
|-----------------|---------------|------------|
| Make | 3-4 hours | Medium |
| Power Automate | 4-5 hours | Medium-High |
| Zapier | 3-4 hours | Medium |
| Custom code | 2-3 hours | Medium |
| n8n (native) | 15 minutes | Low (import JSON) |
