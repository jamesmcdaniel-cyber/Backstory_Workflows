# Adapter QA Patterns

## Golden Cases Should Cover

- happy path
- null or missing fields
- enum drift
- nested shape changes
- identity ambiguity
- delivery formatting edge cases

## Release Gates

- warn-only
- block rollout
- quarantine payloads

## Compare Against

- canonical contract
- expected output snapshot
- expected side effects

## High-Risk Adapter Families

- meeting intelligence
- identity resolution
- CRM normalization
- Teams and Slack delivery formatting
