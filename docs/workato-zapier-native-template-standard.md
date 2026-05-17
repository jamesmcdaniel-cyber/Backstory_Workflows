# Workato And Zapier Native Template Standard

This catalog does not treat Workato and Zapier as “just use HTTP requests” targets.

## Workato

Use a native-first architecture:

- Recipe Functions for reusable subflows
- A Backstory custom connector built with the Connector SDK when a pre-built connector does not exist
- Pre-built Slack connector or Workbot for Slack for delivery
- Pre-built Google Calendar connector for event and task creation

Avoid:

- Repeating Universal HTTP steps for every Backstory lookup
- Using raw HTTP for Slack or Google Calendar when a native connector exists
- Shipping long monolithic recipes when Recipe Functions can isolate source, routing, delivery, and observability

Official references:

- Recipe Functions: `https://docs.workato.com/connectors/recipe-functions.html`
- Custom Connector: `https://docs.workato.com/en/developing-connectors/custom-connector.html`
- Slack connector: `https://docs.workato.com/connectors/slack.html`
- Google Calendar connector: `https://docs.workato.com/en/connectors/google-calendar.html`

## Zapier

Use a native-first architecture:

- A published Backstory custom Zapier integration with explicit actions instead of relying on ad hoc API Request steps
- Native Slack and Google Calendar actions for delivery
- Zapier Tables, Interfaces, or other native control surfaces for bounded state and manual entry where appropriate
- Structured AI output that is validated before delivery actions run

Avoid:

- Using Webhooks by Zapier or API Requests as the long-term production shell for the whole workflow
- Treating Code, Looping, Formatter, Webhooks, or Paths as the core portability strategy for a reusable template
- Sending free-form LLM output directly into delivery actions

Important template constraint:

- Zapier documents that public Zap templates cannot include Paths by Zapier, Code by Zapier, Webhooks by Zapier, Looping by Zapier, or Formatter by Zapier. Complex workflows should therefore ship as a native blueprint bundle or as a custom integration plus prefilled/editor-driven setup flow, not as a misleading “single Zap” template.

Official references:

- Actions: `https://docs.zapier.com/integrations/build/action`
- Create actions: `https://docs.zapier.com/integrations/build/create`
- AI Actions: `https://docs.zapier.com/integrations/reference/ai-actions`
- Template restrictions: `https://docs.zapier.com/integrations/publish/zap-templates`
- API Requests limitations: `https://docs.zapier.com/integrations/reference/custom-actions-api-requests`
