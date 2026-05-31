# Shared n8n Sub-workflows

Import these workflows before importing production templates that depend on them.

Recommended import order:

1. `source-adapter.json`
2. `backstory-enrichment.json`
3. `identity-channel-resolution.json`
4. `delivery-renderer.json`
5. `calendar-task-writer.json`
6. `run-summary-observability.json`

After import, set the shared workflow IDs through environment variables instead of editing the JSON files directly:

- `BACKSTORY_SHARED_SOURCE_ADAPTER_ID`
- `BACKSTORY_SHARED_IDENTITY_ROUTING_ID`
- `BACKSTORY_SHARED_DELIVERY_RENDERER_ID`
- `BACKSTORY_SHARED_CALENDAR_WRITER_ID`
- `BACKSTORY_SHARED_RUN_SUMMARY_ID`
