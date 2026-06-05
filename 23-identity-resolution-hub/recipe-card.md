# Identity Resolution Hub — Platform-Agnostic Recipe

> Rebuild this workflow on **any** orchestration platform to unify people, account, owner, and channel identities before downstream workflows depend on them.

## Prerequisites

- **Source identity exports** — CRM owners, contacts, meeting participants, messaging users, or warehouse snapshots
- **Canonical identity store** — table, graph, queue, or document store for stable entity IDs
- **Merge policy** — precedence rules, confidence thresholds, and manual-review rules
- **Optional LLM API key** — for ambiguity review and human-readable risk explanations

## Architecture

```text
Webhook or CDC -> Normalize Identifiers -> Match Canonical Entities ->
Review Ambiguities -> Publish Identity Update -> Manual Review Queue
```

## Productization Template

Use this workflow in three layers so it scales beyond a single customer environment:

1. **Validated implementations in this repo** — start with the included n8n JSON or Claude/OpenAI workflow instructions when the customer stack matches a shipped asset.
2. **Deep recipes for common orchestrators** — use the rebuild steps below for Make, Power Automate, Zapier, Workato, or a similar orchestration tool.
3. **Generic adaptation path** — preserve the identity model and swap only the source connectors plus the target identity store.

### Common Identity Variants

| Identity source | Common fields | Main risk |
|---|---|---|
| CRM | owner ID, account ID, contact email | duplicate contacts across subsidiaries |
| Messaging | Slack/Teams handle, channel ID | display names are not stable identifiers |
| Calendar / meetings | organizer email, attendee email, transcript participant | participants may be missing final email aliases |
| Warehouse / custom apps | external IDs, region codes, HR identifiers | custom IDs often lack downstream context |

## Step-by-Step Rebuild

### Step 1: Receive Identity Candidates
- **What:** Accept records that might refer to the same person, account, owner, or channel.
- **Examples:** CRM owner exports, Teams user syncs, Fireflies participants, account-channel maps

### Step 2: Normalize Identifiers
- **What:** Extract the fields you trust most.
- **Typical fields:** email, domain, CRM owner ID, source-system ID, messaging handle, account external key

### Step 3: Match Canonical Entities
- **What:** Apply precedence and confidence rules to group records into canonical entities.
- **Best practice:** keep a hard boundary between auto-merge and manual review

### Step 4: Review Ambiguities
- **What:** Explain why certain candidates are risky to auto-merge.
- **Typical causes:** duplicate names, shared inboxes, contractors, acquisitions, regional aliases

### Step 5: Publish the Identity Update
- **What:** Write clean matches to the identity store and route ambiguous ones to review.
- **Rule:** downstream workflows should consume the canonical identity IDs, not raw source identifiers

## Manual Review Queue Example

```json
{
  "candidateId": "candidate-104",
  "reason": "Duplicate display name across two business units",
  "sourceSystems": ["dynamics365", "teams", "fireflies"],
  "recommendedAction": "Review before sponsor-tracking workflows run"
}
```

## Estimated Build Time

| Platform | Estimated Time | Complexity |
|---|---:|---|
| n8n | 2-4 hours | Medium |
| Make | 2-4 hours | Medium |
| Power Automate | 3-5 hours | Medium |
| Zapier | 2-4 hours | Medium |
| Custom code | 1-3 hours | Low |
