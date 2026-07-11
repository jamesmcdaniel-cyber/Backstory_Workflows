import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(__dirname, '..');

const envWorkflowId = (name) => ({
  __rl: true,
  mode: 'id',
  value: `={{ $env.${name} || "" }}`,
});

const connection = (node, type = 'main', index = 0) => ({ node, type, index });

function configurationNode(starter) {
  return {
    parameters: {
      assignments: {
        assignments: [
          { id: 'sd-cfg-1', name: 'workflow_id', type: 'string', value: '01-sales-digest' },
          { id: 'sd-cfg-2', name: 'workflow_name', type: 'string', value: 'Sales Digest' },
          { id: 'sd-cfg-3', name: 'mode', type: 'string', value: starter ? 'starter' : 'production' },
          { id: 'sd-cfg-4', name: 'trigger_type', type: 'string', value: 'schedule' },
          { id: 'sd-cfg-5', name: 'lookback_hours', type: 'number', value: starter ? 24 : '={{ Number($env.SD_LOOKBACK_HOURS || 24) }}' },
          { id: 'sd-cfg-6', name: 'max_subscribers', type: 'number', value: starter ? 2 : '={{ Number($env.SD_MAX_SUBSCRIBERS || 100) }}' },
          { id: 'sd-cfg-7', name: 'dry_run', type: 'boolean', value: starter ? true : '={{ $env.SD_DRY_RUN !== "false" }}' },
          { id: 'sd-cfg-8', name: 'source_api_base_url', type: 'string', value: starter ? '' : '={{ $env.SD_SOURCE_API_BASE_URL || "" }}' },
          { id: 'sd-cfg-9', name: 'source_bearer_token', type: 'string', value: starter ? '' : '={{ $env.SD_SOURCE_BEARER_TOKEN || "" }}' },
          { id: 'sd-cfg-10', name: 'default_channel_id', type: 'string', value: starter ? '' : '={{ $env.SD_DEFAULT_CHANNEL_ID || "" }}' },
          { id: 'sd-cfg-11', name: 'summary_channel_id', type: 'string', value: starter ? '' : '={{ $env.SD_SUMMARY_CHANNEL_ID || "" }}' },
        ],
      },
      options: {},
    },
    id: 'sd-configuration',
    name: 'Workflow Configuration',
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [-1080, 180],
  };
}

function sourceNode(starter) {
  if (starter) {
    return {
      parameters: {
        jsCode:
          "const runContext = $input.first().json.run_context || $input.first().json;\n" +
          "return [\n" +
          "  { json: { source_id: 'demo-sub-1', owner: 'sarah.chen', account_name: 'Globex Industries', raw_record: { subscriber_name: 'Sarah Chen', owner_email: 'sarah.chen@example.test', slack_channel_id: '', accounts: [{ name: 'Globex Industries', stage: 'Negotiation', amount: 340000, last_activity_days: 1 }] }, run_context: runContext } },\n" +
          "  { json: { source_id: 'demo-sub-2', owner: 'david.park', account_name: 'Initech', raw_record: { subscriber_name: 'David Park', owner_email: 'david.park@example.test', slack_channel_id: '', accounts: [{ name: 'Initech', stage: 'Technical Validation', amount: 128000, last_activity_days: 6 }] }, run_context: runContext } }\n" +
          "];",
      },
      id: 'sd-load-subscribers',
      name: 'Load Digest Subscribers',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [-520, 180],
      notes: 'Demo Starter: loads fictional subscriber fixtures locally. No source system or delivery destination is contacted.',
      notesInFlow: true,
    };
  }
  return {
    parameters: { workflowId: envWorkflowId('BACKSTORY_SHARED_SOURCE_ADAPTER_ID'), options: {} },
    id: 'sd-load-subscribers',
    name: 'Load Digest Subscribers',
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.2,
    position: [-520, 180],
  };
}

export function buildSalesDigestWorkflow({ starter = false } = {}) {
  const nodes = [
    {
      parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 6 * * 1-5' }] } },
      id: 'sd-schedule',
      name: 'Schedule Trigger',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [-1320, 180],
    },
    configurationNode(starter),
    {
      parameters: {
        assignments: {
          assignments: [
            { id: 'sd-src-1', name: 'run_context', type: 'json', value: '={{ $json }}' },
            { id: 'sd-src-2', name: 'source_system', type: 'string', value: 'sales_digest_subscribers' },
            { id: 'sd-src-3', name: 'source_api_base_url', type: 'string', value: '={{ $json.source_api_base_url }}' },
            { id: 'sd-src-4', name: 'source_bearer_token', type: 'string', value: '={{ $json.source_bearer_token }}' },
            { id: 'sd-src-5', name: 'source_path', type: 'string', value: '/sales-digest/subscribers' },
            { id: 'sd-src-6', name: 'source_method', type: 'string', value: 'POST' },
            { id: 'sd-src-7', name: 'source_body', type: 'json', value: '={{ { lookback_hours: $json.lookback_hours, limit: $json.max_subscribers } }}' },
          ],
        },
        options: {},
      },
      id: 'sd-source-contract',
      name: 'Subscriber Source Contract',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [-800, 180],
    },
    sourceNode(starter),
    {
      parameters: {
        assignments: {
          assignments: [
            {
              id: 'sd-prompt-1',
              name: 'agent_prompt',
              type: 'string',
              value:
                '=Return strict JSON only with keys subscriber_name, headline, pipeline_movement, engagement_highlights, recommended_actions, and missing_data. The three detail fields must be arrays of short strings.\n\n' +
                'Create a personalized daily sales digest from this subscriber packet. Use Backstory MCP only to enrich account, opportunity, activity, and stakeholder context. Do not route or deliver messages.\n\n' +
                'Run context:\n{{ JSON.stringify($json.run_context || {}, null, 2) }}\n\n' +
                'Subscriber packet:\n{{ JSON.stringify($json.raw_record || $json, null, 2) }}\n\n' +
                'Rules:\n- Use only supported facts.\n- Include concrete dates, owners, stages, and amounts when present.\n- Put the most urgent action first.\n- If evidence is missing, list it in missing_data rather than inventing it.\n- Keep each item short enough for Slack.',
            },
          ],
        },
        options: {},
      },
      id: 'sd-build-prompt',
      name: 'Build Digest Prompt',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [-240, 180],
    },
    {
      parameters: {
        promptType: 'define',
        text: '={{ $json.agent_prompt }}',
        options: { systemMessage: 'You are a sales intelligence analyst. Use Backstory MCP only for enrichment. Return valid JSON; keep routing and delivery deterministic.' },
      },
      id: 'sd-agent',
      name: 'Generate Sales Digest',
      type: '@n8n/n8n-nodes-langchain.agent',
      typeVersion: 2,
      position: [40, 180],
    },
    {
      parameters: {
        model: { __rl: true, mode: 'list', value: 'claude-sonnet-4-6', cachedResultName: 'Claude Sonnet 4.6' },
        options: {},
      },
      id: 'sd-anthropic',
      name: 'Anthropic Chat Model',
      type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
      typeVersion: 1.3,
      position: [20, 420],
    },
    {
      parameters: { endpointUrl: 'https://mcp.people.ai/mcp', authentication: 'multipleHeadersAuth', options: {} },
      id: 'sd-mcp',
      name: 'Backstory MCP',
      type: '@n8n/n8n-nodes-langchain.mcpClientTool',
      typeVersion: 1.1,
      position: [220, 420],
    },
    {
      parameters: {
        jsCode:
          "const item = $input.first().json;\n" +
          "const raw = item.output || item.text || item.response || '{}';\n" +
          "const cleaned = String(raw).trim().replace(/^```json\\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();\n" +
          "let digest;\n" +
          "try { digest = JSON.parse(cleaned); } catch { digest = { subscriber_name: item.owner || 'Sales teammate', headline: 'Daily sales digest', pipeline_movement: [], engagement_highlights: [], recommended_actions: ['Review source activity manually.'], missing_data: ['The model response was not valid JSON.'] }; }\n" +
          "const list = (value) => Array.isArray(value) ? value.filter(Boolean).map(String) : [];\n" +
          "const section = (title, values) => values.length ? [title, ...values.map((value) => `• ${value}`)].join('\\n') : '';\n" +
          "const pipeline = list(digest.pipeline_movement); const engagement = list(digest.engagement_highlights); const actions = list(digest.recommended_actions); const missing = list(digest.missing_data);\n" +
          "const body = [`☀️ *${digest.headline || 'Daily Sales Digest'}*`, section('*Pipeline movement*', pipeline), section('*Engagement highlights*', engagement), section('*Recommended actions*', actions), missing.length ? `_Missing data: ${missing.join('; ')}_` : ''].filter(Boolean).join('\\n\\n');\n" +
          "const runContext = item.run_context || {}; const source = item.raw_record || {};\n" +
          "return [{ json: { ...item, workflow_id: '01-sales-digest', workflow_name: 'Sales Digest', run_context: runContext, target_type: 'channel', target_id: source.slack_channel_id || source.channel_id || runContext.default_channel_id || '', delivery_title: digest.headline || 'Daily Sales Digest', delivery_body: body, delivery_format: 'mrkdwn', thread_key: `sales-digest:${item.source_id || item.owner || 'subscriber'}`, dedupe_key: `01-sales-digest:${item.source_id || item.owner || 'subscriber'}:${new Date().toISOString().slice(0, 10)}`, summary_channel_id: runContext.summary_channel_id || '', summary_detail: `Prepared digest for ${digest.subscriber_name || item.owner || 'subscriber'}.` } }];",
      },
      id: 'sd-parse',
      name: 'Parse Structured Digest',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [320, 180],
    },
    {
      parameters: { workflowId: envWorkflowId('BACKSTORY_SHARED_IDENTITY_ROUTING_ID'), options: {} },
      id: 'sd-resolve-target',
      name: 'Resolve Delivery Target',
      type: 'n8n-nodes-base.executeWorkflow',
      typeVersion: 1.2,
      position: [600, 180],
    },
    {
      parameters: { workflowId: envWorkflowId('BACKSTORY_SHARED_DELIVERY_RENDERER_ID'), options: {} },
      id: 'sd-render-delivery',
      name: 'Render Delivery Payload',
      type: 'n8n-nodes-base.executeWorkflow',
      typeVersion: 1.2,
      position: [880, 180],
    },
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
          conditions: [
            { id: 'sd-gate-1', leftValue: '={{ $json.run_context.dry_run }}', rightValue: '', operator: { type: 'boolean', operation: 'false', singleValue: true } },
            { id: 'sd-gate-2', leftValue: '={{ $json.delivery_payload.target_id }}', rightValue: '', operator: { type: 'string', operation: 'notEmpty', singleValue: true } },
          ],
          combinator: 'and',
        },
        options: {},
      },
      id: 'sd-delivery-gate',
      name: 'Delivery Enabled?',
      type: 'n8n-nodes-base.if',
      typeVersion: 2.2,
      position: [1160, 180],
    },
    {
      parameters: {
        authentication: 'oAuth2',
        select: 'channel',
        channelId: { __rl: true, mode: 'id', value: '={{ $json.delivery_payload.target_id }}' },
        text: '={{ $json.delivery_payload.body }}',
        otherOptions: { unfurl_links: false },
      },
      id: 'sd-post-slack',
      name: 'Post Personal Digest',
      type: 'n8n-nodes-base.slack',
      typeVersion: 2.3,
      position: [1440, 100],
    },
    {
      parameters: { workflowId: envWorkflowId('BACKSTORY_SHARED_RUN_SUMMARY_ID'), options: {} },
      id: 'sd-run-summary',
      name: 'Record Run Summary',
      type: 'n8n-nodes-base.executeWorkflow',
      typeVersion: 1.2,
      position: [1720, 180],
    },
  ];

  const connections = {
    'Schedule Trigger': { main: [[connection('Workflow Configuration')]] },
    'Workflow Configuration': { main: [[connection('Subscriber Source Contract')]] },
    'Subscriber Source Contract': { main: [[connection('Load Digest Subscribers')]] },
    'Load Digest Subscribers': { main: [[connection('Build Digest Prompt')]] },
    'Build Digest Prompt': { main: [[connection('Generate Sales Digest')]] },
    'Anthropic Chat Model': { ai_languageModel: [[connection('Generate Sales Digest', 'ai_languageModel')]] },
    'Backstory MCP': { ai_tool: [[connection('Generate Sales Digest', 'ai_tool')]] },
    'Generate Sales Digest': { main: [[connection('Parse Structured Digest')]] },
    'Parse Structured Digest': { main: [[connection('Resolve Delivery Target')]] },
    'Resolve Delivery Target': { main: [[connection('Render Delivery Payload')]] },
    'Render Delivery Payload': { main: [[connection('Delivery Enabled?')]] },
    'Delivery Enabled?': { main: [[connection('Post Personal Digest')], [connection('Record Run Summary')]] },
    'Post Personal Digest': { main: [[connection('Record Run Summary')]] },
  };

  return {
    name: starter ? 'Sales Digest — Demo Starter' : 'Sales Digest — Production Template',
    description: 'Personalized weekday sales digest using shared source, identity, delivery, and observability contracts with bounded Backstory MCP enrichment and native Slack delivery.',
    active: false,
    settings: { executionOrder: 'v1' },
    pinData: {},
    versionId: starter ? '01-sales-digest-starter-v3' : '01-sales-digest-production-v3',
    meta: { templateCredsSetupCompleted: false, demoStarter: starter },
    id: starter ? '01-sales-digest-starter' : '01-sales-digest-production',
    nodes,
    connections,
  };
}

const sourceDoc = `# 01 — Sales Digest

## Overview

The production template uses shared contracts for subscriber loading, identity routing, delivery rendering, and run observability. The AI step is bounded to Backstory enrichment and structured digest synthesis; routing and Slack delivery remain deterministic.

## Attached Platform Assets

- \`full.json\`: production n8n template
- \`starter.json\`: fixture-backed, dry-run-safe demo
- \`workato-guide.pdf\`: Workato implementation guide
- \`zapier-guide.pdf\`: Zapier implementation guide

## Contracts

- \`run_context\`: schedule, mode, lookback, dry-run, source, and delivery defaults
- \`source_record\`: one subscriber packet with owner and relevant account/deal inputs
- \`enrichment_context\`: Backstory MCP evidence used only during synthesis
- \`delivery_payload\`: deterministic Slack target, body, thread key, and dedupe key

## Production Configuration

- \`SD_SOURCE_API_BASE_URL\`
- \`SD_SOURCE_BEARER_TOKEN\`
- \`SD_DEFAULT_CHANNEL_ID\`
- \`SD_SUMMARY_CHANNEL_ID\`
- \`SD_LOOKBACK_HOURS\`
- \`SD_MAX_SUBSCRIBERS\`
- \`SD_DRY_RUN\` (delivery remains disabled unless explicitly set to \`false\`)
- Shared source, identity routing, delivery renderer, and run-summary workflow IDs

## Design Rules

1. The shared source adapter owns subscriber and source-system normalization.
2. The model returns strict JSON and never performs delivery side effects.
3. Missing evidence is surfaced instead of invented.
4. The identity and delivery sub-workflows own target resolution and payload formatting.
5. Native Slack delivery runs only when dry-run is false and a target is present.
6. The starter uses fictional fixtures and cannot send a message by default.

## Required Shared Sub-workflows

- Shared — Source Adapter
- Shared — Identity And Channel Resolution
- Shared — Delivery Renderer
- Shared — Run Summary And Observability
`;

const recipeDoc = `# Sales Digest — Platform-Agnostic Recipe

## Reference Architecture

\`schedule -> run context -> source adapter -> Backstory enrichment -> structured digest -> identity resolution -> delivery renderer -> native delivery -> run summary\`

## Production Implementation Notes

- Return one canonical subscriber packet per digest recipient.
- Keep Backstory MCP usage inside the bounded synthesis step.
- Require structured model output before formatting or delivery.
- Resolve recipients through shared identity configuration rather than prompt output.
- Keep dry-run on until representative source and routing tests pass.

## Agent Boundary

The agent prioritizes evidence and writes the digest. Source access, identity resolution, formatting, dedupe, delivery, and observability are deterministic components.
`;

export function rebuildSalesDigestParity(repoRoot = defaultRepoRoot) {
  const dir = path.join(repoRoot, '01-sales-digest');
  fs.writeFileSync(path.join(dir, 'full.json'), `${JSON.stringify(buildSalesDigestWorkflow(), null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'starter.json'), `${JSON.stringify(buildSalesDigestWorkflow({ starter: true }), null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'SOURCE.md'), sourceDoc);
  fs.writeFileSync(path.join(dir, 'recipe-card.md'), recipeDoc);
  return { workflowId: '01-sales-digest', variants: ['full.json', 'starter.json'] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(rebuildSalesDigestParity(), null, 2));
}
