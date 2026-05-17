# Shared n8n Sub-workflows

Import these workflows before importing production templates that depend on them.

Recommended import order:

1. `source-adapter.json`
2. `backstory-enrichment.json`
3. `identity-channel-resolution.json`
4. `delivery-renderer.json`
5. `calendar-task-writer.json`
6. `run-summary-observability.json`

After import, bind each production `Execute Sub-workflow` node to the corresponding workflow ID in your n8n instance.
