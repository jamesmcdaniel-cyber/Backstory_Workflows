# CRM Signal Normalizer — Platform-Agnostic Recipe

> Rebuild this workflow on **any** orchestration platform to normalize CRM records into one reusable schema for downstream Backstory workflows.

## Prerequisites

- **CRM access** — Salesforce, Dynamics 365, HubSpot, or equivalent API credentials
- **Canonical schema definition** — shared account, contact, opportunity, owner, activity, and stage fields
- **Destination for normalized events** — webhook, queue, warehouse, or database
- **Optional LLM API key** — for mapping QA and schema-drift explanations

## Architecture

```text
Schedule or Webhook -> Fetch Changed Records -> Canonical Field Mapping ->
Identity Resolution -> Publish Normalized Payload -> QA Alert
```

## Productization Template

Use this workflow in three layers so it scales beyond a single customer environment:

1. **Validated implementations in this repo** — start with the included n8n JSON or Claude/OpenAI workflow instructions when the customer stack matches a shipped asset.
2. **Deep recipes for common orchestrators** — use the rebuild steps below for Make, Power Automate, Zapier, Workato, or a similar orchestration tool.
3. **Generic adaptation path** — preserve the workflow pattern and substitute equivalent connectors for customer-specific systems.

### Common CRM Variants

| Source | Typical substitutions | Notes |
|---|---|---|
| Salesforce | `Opportunity`, `Account`, `Contact`, `OwnerId`, `StageName` | Often the baseline schema in early implementations. |
| Dynamics 365 | `opportunity`, `account`, `contact`, `ownerid`, `stepname` or stage fields | Normalize names and timestamps carefully; relationship fields differ. |
| HubSpot | deals, companies, contacts, owners | Stage and pipeline semantics differ; define canonical stage translation rules. |
| Custom CRM / warehouse | customer-specific table or API names | Keep the canonical output contract stable and isolate custom logic in the fetch layer. |

## Step-by-Step Rebuild

### Step 1: Choose the Trigger
- **What:** Poll for changed records or receive CDC/webhook events.
- **Make / Power Automate / Zapier:** Use schedule when webhooks are unavailable; prefer webhooks or CDC for larger volumes.

### Step 2: Fetch Changed Records
- **What:** Pull only the accounts, contacts, opportunities, and owner changes needed for downstream workflows.
- **Salesforce:** SOQL or CDC
- **Dynamics 365:** Dataverse connector or OData queries
- **HubSpot:** Deals / companies / contacts APIs with updated timestamps

### Step 3: Map to the Canonical Schema
- **What:** Convert source fields into a stable cross-tool payload.
- **Canonical fields to preserve:** account name, opportunity name, stage, amount, close date, owner, contact roles, activity timestamps, source IDs
- **Rule:** Downstream workflows should not care which CRM produced the record.

### Step 4: Resolve Identity and Duplicates
- **What:** Deduplicate by source ID, email, domain, or account key.
- **Common risk:** Salesforce account names, Dynamics GUIDs, and HubSpot object IDs rarely align cleanly without a mapping layer.

### Step 5: Publish the Canonical Payload
- **What:** Send the normalized record to the rest of your workflow system.
- **Common sinks:** webhook, queue, warehouse, Supabase, Postgres, Redis, or another orchestrator

### Step 6: Run Mapping QA
- **What:** Optionally use an LLM to explain missing fields, drift, or downstream risks.
- **Use case:** especially helpful during new-customer rollout or when onboarding Dynamics/custom schemas.

## Canonical Output Example

```json
{
  "accountName": "Acme Corp",
  "opportunityName": "Enterprise Renewal",
  "stage": "Negotiation",
  "amount": 425000,
  "closeDate": "2026-06-30",
  "owner": "Sarah Chen",
  "sourceSystem": "Dynamics 365",
  "sourceId": "opp-12345"
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
