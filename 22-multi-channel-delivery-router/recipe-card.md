# Multi-Channel Delivery Router — Platform-Agnostic Recipe

> Rebuild this workflow on **any** orchestration platform to route one insight payload across Slack, Teams, email, and webhook destinations without cloning the business logic.

## Prerequisites

- **Inbound insight payloads** — messages from your other workflows or applications
- **Routing store** — account/team/user mapping for preferred delivery channels
- **Delivery credentials** — Slack, Teams, SMTP, webhook, or queue credentials
- **Optional LLM API key** — for reformatting payloads between delivery surfaces

## Architecture

```text
Webhook Intake -> Resolve Destination -> Adapt Message Format ->
Send to Target Surface -> Fallback Route -> Delivery Log
```

## Productization Template

Use this workflow in three layers so it scales beyond a single customer environment:

1. **Validated implementations in this repo** — start with the included n8n JSON or Claude/OpenAI workflow instructions when the customer stack matches a shipped asset.
2. **Deep recipes for common orchestrators** — use the rebuild steps below for Make, Power Automate, Zapier, Workato, or a similar orchestration tool.
3. **Generic adaptation path** — preserve the workflow pattern and substitute equivalent connectors for customer-specific systems.

### Common Delivery Variants

| Target surface | Typical payload style | Common adaptation need |
|---|---|---|
| Slack | markdown text or blocks | easy baseline, but often overused as the default format |
| Microsoft Teams | chat messages or cards | cards and line breaks differ from Slack |
| Email | plain text or HTML | often needs more context and subject lines |
| Webhook / queue | JSON payload | best for chaining systems instead of human delivery |

## Step-by-Step Rebuild

### Step 1: Receive the Insight Payload
- **What:** Accept a ready-to-deliver message plus routing metadata from another workflow.
- **Common inputs:** account name, owner, audience, preferred channel, message body, fallback channel

### Step 2: Resolve the Destination
- **What:** Look up the best delivery surface by account, role, owner, team, or customer segment.
- **Sources:** Sheets, Airtable, database, CRM fields, config service, or hardcoded mapping for early prototypes

### Step 3: Adapt the Message
- **What:** Convert the payload into the target format without changing the underlying insight.
- **Examples:**
  - Slack markdown -> Teams-safe chat copy or adaptive-card JSON
  - Slack summary -> email subject + HTML body
  - human-readable message -> webhook-safe JSON envelope

### Step 4: Send to the Target Surface
- **What:** Use the first-party connector or a generic webhook/SMTP action.
- **Rule:** Keep the delivery step thin so the payload logic stays reusable.

### Step 5: Apply Fallback Routing
- **What:** If Slack or Teams fails, route to email or a fallback webhook.
- **Best practice:** Log the original destination, failure reason, fallback target, and timestamp.

## Routing Store Example

```json
{
  "Acme Corp": {
    "preferred": "teams",
    "fallback": "email",
    "channelId": "19:team-thread-id"
  }
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
