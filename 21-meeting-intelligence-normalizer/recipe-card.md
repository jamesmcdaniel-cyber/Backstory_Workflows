# Meeting Intelligence Normalizer — Platform-Agnostic Recipe

> Rebuild this workflow on **any** orchestration platform to normalize meetings, transcripts, attendees, and action items across note-taker systems.

## Prerequisites

- **Meeting or transcript source access** — Gong, Zoom, Teams, Google Meet, Otter, Fireflies, Fathom, or equivalent
- **Optional calendar source** — Google Calendar or Microsoft 365 if meeting metadata is separate from transcript systems
- **Canonical meeting schema** — shared fields for title, attendees, transcript summary, action items, account mapping, and source IDs
- **Destination for normalized meeting events** — webhook, queue, warehouse, or database

## Architecture

```text
Webhook or Schedule -> Fetch Meeting Artifacts -> Normalize Transcript and Attendees ->
Resolve Account Association -> Publish Canonical Meeting Event -> QA Alert
```

## Productization Template

Use this workflow in three layers so it scales beyond a single customer environment:

1. **Validated implementations in this repo** — start with the included n8n JSON or Claude/OpenAI workflow instructions when the customer stack matches a shipped asset.
2. **Deep recipes for common orchestrators** — use the rebuild steps below for Make, Power Automate, Zapier, Workato, or a similar orchestration tool.
3. **Generic adaptation path** — preserve the workflow pattern and substitute equivalent connectors for customer-specific systems.

### Common Meeting-Source Variants

| Source family | Typical payload strengths | Common normalization risk |
|---|---|---|
| Gong / Chorus | strong transcript and speaker data | calendar/account association may need a second source |
| Zoom / Teams native meetings | reliable meeting metadata | transcript quality and action-item extraction vary |
| Otter / Fireflies / Fathom | usable summaries and tasks | attendee identity, company, and CRM mapping often need extra logic |
| Google / Microsoft calendar only | clean attendee and timing data | no transcript or action-item layer without another source |

## Step-by-Step Rebuild

### Step 1: Choose the Trigger
- **What:** Poll for new completed meetings or receive webhook events from your note-taker.
- **Rule:** Prefer webhooks for real-time use cases and schedule-based sync for platforms without reliable webhooks.

### Step 2: Fetch Meeting Artifacts
- **What:** Pull title, meeting time, attendees, transcript snippets, summary, and action items.
- **Tip:** If the transcript source lacks clean attendee metadata, join it with calendar data before normalizing.

### Step 3: Normalize to the Canonical Meeting Schema
- **What:** Convert each source into one meeting object shape.
- **Canonical fields:** `meetingTitle`, `meetingStart`, `accountName`, `attendees`, `transcriptSummary`, `actionItems`, `sourceId`
- **Rule:** Downstream workflows should consume the same object whether the source was Gong, Teams, Zoom, Otter, or Fireflies.

### Step 4: Resolve Account and Owner Mapping
- **What:** Match the meeting to CRM accounts, owners, or deal context.
- **Common logic:** email-domain matching, attendee lookup, calendar ownership, or explicit CRM references

### Step 5: Publish the Meeting Event
- **What:** Send the normalized meeting object to prep, coaching, QBR, or follow-up workflows.
- **Common sinks:** webhook, queue, warehouse, or sub-workflow trigger

### Step 6: Run QA
- **What:** Flag missing account matches, weak transcripts, or ambiguous attendee identities before the data fans out.

## Canonical Output Example

```json
{
  "meetingTitle": "Acme Technical Review",
  "meetingStart": "2026-04-30T14:00:00Z",
  "accountName": "Acme Corp",
  "attendees": ["sarah.chen@yourco.com", "lisa.wong@acme.com"],
  "transcriptSummary": "Security review completed; API timeline still open.",
  "actionItems": ["Send SOC2 report", "Confirm custom API milestone"],
  "sourceSystem": "Fireflies",
  "sourceId": "meeting-12345"
}
```

## Estimated Build Time

| Platform | Estimated Time | Complexity |
|---|---:|---|
| n8n | 2-4 hours | Medium |
| Make | 3-5 hours | Medium |
| Power Automate | 3-5 hours | Medium |
| Zapier | 3-4 hours | Medium |
| Custom code | 2-4 hours | Medium |
