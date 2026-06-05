# Workflow Contract Validator — Platform-Agnostic Recipe

> Rebuild this workflow on **any** orchestration platform to validate payloads between workflow steps before schema drift breaks downstream logic.

## Prerequisites

- **Upstream payload source** — workflow step, queue, webhook, or API that emits payloads
- **Contract registry** — required fields, enum values, versions, and boundary names
- **Quarantine sink** — queue, webhook, or database for failed payloads
- **Optional LLM API key** — for readable drift explanations and troubleshooting notes

## Architecture

```text
Webhook Intake -> Load Expected Contract -> Validate Payload Shape ->
Analyze Drift -> Pass or Quarantine -> Replay After Fix
```

## Productization Template

Use this workflow in three layers so it scales beyond a single customer environment:

1. **Validated implementations in this repo** — start with the included n8n JSON or Claude/OpenAI workflow instructions when the customer stack matches a shipped asset.
2. **Deep recipes for common orchestrators** — use the rebuild steps below for Make, Power Automate, Zapier, Workato, or a similar orchestration tool.
3. **Generic adaptation path** — keep the same contract registry and validation rules, then swap the connector that transports the payload.

### Common Contract Boundaries

| Boundary type | Example | Common drift |
|---|---|---|
| Source normalization -> insight generation | CRM batch -> churn summary | renamed stage, owner, or account fields |
| Meeting normalization -> prep workflow | transcript event -> brief generator | missing account ID or nested action-item changes |
| Insight generation -> delivery | summary -> router | absent destination metadata or bad channel identifiers |
| Adapter -> storage | canonical payload -> warehouse | enum or timestamp-format changes |

## Step-by-Step Rebuild

### Step 1: Receive the Payload Batch
- **What:** Capture one or more payloads before the downstream step runs.
- **Inputs:** workflow name, boundary name, contract version, records

### Step 2: Load the Expected Contract
- **What:** Retrieve the required schema for the named workflow boundary.
- **Best practice:** version contracts independently from connector implementations

### Step 3: Validate the Payload Shape
- **What:** Check required fields, arrays, enums, timestamps, nested objects, and routing metadata.
- **Rule:** separate warn-only issues from quarantine-level failures

### Step 4: Analyze Drift
- **What:** Explain where the payload changed and which upstream connector or workflow step likely introduced the drift.
- **Useful for:** handoffs between solutions, product, and engineering

### Step 5: Pass or Quarantine
- **What:** Send valid payloads onward and route invalid ones to a replay queue.
- **Best practice:** keep the original payload plus validation context for replay

## Contract Example

```json
{
  "boundaryName": "meeting-intelligence-to-qbr-prep",
  "contractVersion": "meeting-intelligence-v1",
  "requiredFields": ["accountId", "meetingId", "participants", "transcriptSummary"],
  "warnOnlyFields": ["competitorMentions", "execAttendees"]
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
