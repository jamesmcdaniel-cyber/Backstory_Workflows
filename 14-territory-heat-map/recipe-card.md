# Territory Heat Map — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> canonical source adapter -> Backstory enrichment -> structured analysis -> identity resolution -> delivery renderer -> native delivery -> run summary`

## Implementation Rules

1. Normalize connector-specific data into one canonical source record.
2. Use Backstory MCP only for enrichment and evidence analysis.
3. Require structured model output before deterministic routing.
4. Use stable source IDs, claims, and dedupe keys.
5. Keep dry-run enabled until representative source, routing, and delivery tests pass.

## Purpose

Generates a weekly territory heat map digest for each rep, showing which accounts in their territory are heating up (increased inbound, new contacts engaging, meeting frequency rising) versus cooling down (declining engagement, unresponsive contacts). The workflow pulls Backstory engagement data across all accounts in each rep's territory, calculates week-over-week momentum scores, and uses an AI agent to summarize trends and recommend where to focus time. Delivered every Monday to help reps prioritize their week.
