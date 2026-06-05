# Meeting Brief — Platform-Agnostic Recipe

> Rebuild this workflow on **any** automation platform (Make, Power Automate, Zapier, Workato, etc.)

## Prerequisites

- **Backstory API access** — REST API or MCP-to-REST bridge
- **LLM API key** — Claude, OpenAI, or any chat completion endpoint
- **Calendar API** — Google Calendar, Outlook Calendar, or Cal.com
- **Messaging credentials** — Slack Bot Token, Teams Webhook, or SMTP

## Architecture

```
Cron (every 15 min) → Check Calendar → Filter Upcoming Meetings →
  Loop Each Meeting → Fetch Account Context → AI Generate Brief → Deliver
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

### Step 1: Cron Trigger
- **What:** Fire every 15 minutes during business hours
- **Make:** Schedule module → every 15 min, 8 AM–6 PM
- **Power Automate:** Recurrence → 15 min interval + Condition (business hours)
- **Zapier:** Schedule by Zapier → every 15 minutes

### Step 2: Check Calendar for Upcoming Meetings
- **What:** Query calendar API for meetings starting in the next 30 minutes
- **Google Calendar API:** `GET /calendars/primary/events?timeMin={now}&timeMax={now+30m}`
- **Outlook Calendar:** `GET /me/calendarView?startDateTime={now}&endDateTime={now+30m}`
- **Make:** Google Calendar → Watch Events / Microsoft Outlook → List Events
- **Power Automate:** Get calendar view of events (Office 365) or Google Calendar connector
- **Zapier:** Google Calendar → Event Start or Microsoft Outlook → New Event

### Step 3: Filter Meetings Worth Briefing
- **What:** Skip internal-only meetings, 1:1s, all-hands — only brief on external calls
- **Logic:** Check if attendees include external domains or if meeting has an associated account
- **All platforms:** Filter/Router step checking attendee email domains

### Step 4: Fetch Account Context from Backstory
- **What:** For each meeting's account, pull engagement history and deal status
- **API call:** For each account:
  `POST /api/v1/accounts/{name}/context`
  Body: `{ "include": ["deals", "contacts", "recent_activity", "engagement_timeline"] }`
- **All platforms:** HTTP request module with Backstory REST API

### Step 5: AI Brief Generation
- **What:** Send meeting details + account context to LLM for structured brief
- **API call:** `POST https://api.anthropic.com/v1/messages`
- **System prompt:**
  ```
  You are a sales intelligence assistant generating pre-meeting briefings.
  Given meeting details and account context, produce:
  - Meeting header with account, time, type
  - ATTENDEES with roles and engagement history
  - ACCOUNT CONTEXT with deal info and recent signals
  - TALKING POINTS (3-5 prioritized)
  - WATCH FOR section with risks
  Use emoji headers. Be specific with names, amounts, dates.
  ```
- **User message:** Include meeting details + all account context
- **Make:** HTTP module → POST to Anthropic/OpenAI
- **Power Automate:** HTTP action or AI Builder
- **Zapier:** OpenAI integration or HTTP request for Claude

### Step 6: Deliver Brief
- **What:** Send the brief to the meeting owner before the call
- **Slack DM:** `POST https://slack.com/api/chat.postMessage`
  Body: `{ "channel": "{owner_slack_id}", "text": "{brief}" }`
- **Teams:** Post to user's 1:1 chat via Microsoft Graph
- **Email:** SMTP with HTML body
- **Make:** Slack → Send a Message / Microsoft Teams → Send a Message
- **Power Automate:** Post Message in a Chat (Teams) or Send Email
- **Zapier:** Slack → Send Direct Message

## MCP Gap Workaround

Backstory MCP is not natively supported on Make, Power Automate, or Zapier.
Options:
1. **Use Backstory REST API directly** — if available in your contract
2. **Deploy an MCP-to-REST bridge** — lightweight proxy that translates MCP calls to HTTP
3. **Use n8n as MCP middleware** — n8n handles MCP, exposes results via webhook for other platforms

## Deduplication

Since the cron fires every 15 minutes, you need deduplication to avoid briefing the same meeting twice:
- **Simple:** Store briefed meeting IDs in a Google Sheet or database, check before processing
- **Make:** Use a Data Store module to track processed meeting IDs
- **Power Automate:** Use a SharePoint list or Dataverse table
- **Zapier:** Use Storage by Zapier or a Google Sheet lookup

## Estimated Build Time

| Platform        | Estimated Time | Complexity |
|-----------------|---------------|------------|
| Make            | 3-4 hours     | Medium-High |
| Power Automate  | 4-5 hours     | High       |
| Zapier          | 3-4 hours     | Medium-High |
| Custom code     | 2-3 hours     | Medium     |
| n8n (native)    | 15 minutes    | Low (import JSON) |
