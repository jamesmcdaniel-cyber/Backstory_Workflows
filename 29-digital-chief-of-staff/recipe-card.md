# Digital Chief of Staff — Platform-Agnostic Recipe

## Reference Architecture

`trigger -> normalize -> source adapter -> enrich -> analyze -> route -> deliver -> summarize`

## Production Implementation Notes

- Use the production `full.json` in n8n when you can import shared sub-workflows and native Slack + Google Calendar credentials.
- Use `starter.json` when you need a safe sandbox import or a customer workshop artifact.
- Use `workato-template.json` when you want a Recipe Functions + custom connector implementation in Workato.
- Use `zapier-template.json` when you need a native Zapier blueprint built around a published custom app rather than raw API request steps.
- Preserve the contract boundaries if you port this to Make, Power Automate, Zapier, or custom code.

## Shared Components To Recreate Outside n8n

- Source adapter
- Identity and channel resolution
- Delivery renderer
- Calendar/task writer
- Run summary and observability

## Agent Boundary

Keep agentic behavior limited to:

- account-update synthesis
- daily-briefing synthesis

Everything else should stay deterministic and connector-native.
