import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(__dirname, '..');

export const LEGACY_PARITY_IDS = [
  '03-silence-contract-monitor',
  '07-churn-risk-scorecard',
  '08-renewal-prep-brief',
  '09-onboarding-pulse',
  '10-activity-gap-detector',
  '11-deal-hygiene-audit',
  '12-win-loss-debrief',
  '13-competitive-displacement-alert',
  '14-territory-heat-map',
  '15-qbr-auto-prep',
  '16-executive-sponsor-tracker',
  '17-marketing-sales-handoff-scorer',
];

const envWorkflowId = (name) => ({ __rl: true, mode: 'id', value: `={{ $env.${name} || "" }}` });
const connection = (node, type = 'main', index = 0) => ({ node, type, index });
const prefixFor = (id) => id.replace(/^\d+-/, '').split('-').map((part) => part[0]).join('').toUpperCase();

function triggerNode(workflow, prefix) {
  const webhook = /webhook|event|stage change/i.test(workflow.trigger || '');
  if (webhook) {
    return {
      parameters: { path: workflow.id, httpMethod: 'POST', responseMode: 'onReceived' },
      id: `${prefix.toLowerCase()}-trigger`, name: 'Webhook Trigger', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [-1320, 180],
    };
  }
  const weekly = /weekly/i.test(workflow.trigger || '');
  return {
    parameters: { rule: { interval: [{ field: 'cronExpression', expression: weekly ? '0 7 * * 1' : '0 7 * * 1-5' }] } },
    id: `${prefix.toLowerCase()}-trigger`, name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [-1320, 180],
  };
}

function sourceNode(workflow, prefix, starter) {
  if (!starter) {
    return {
      parameters: { workflowId: envWorkflowId('BACKSTORY_SHARED_SOURCE_ADAPTER_ID'), options: {} },
      id: `${prefix.toLowerCase()}-source`, name: 'Load Canonical Source Records', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.2, position: [-520, 180],
    };
  }
  return {
    parameters: {
      jsCode: `const runContext = $input.first().json.run_context || $input.first().json;
return [{ json: {
  source_id: 'fictional-${workflow.id}-1',
  account_name: 'Globex Industries',
  owner: 'demo.owner',
  raw_record: { id: 'fictional-${workflow.id}-1', account_name: 'Globex Industries', status: 'test', amount: 125000, last_activity_days: 14, note: 'Fictional representative record for ${workflow.name}.' },
  run_context: runContext
} }];`,
    },
    id: `${prefix.toLowerCase()}-source`, name: 'Load Canonical Source Records', type: 'n8n-nodes-base.code', typeVersion: 2, position: [-520, 180],
    notes: 'Demo Starter: uses a fictional local fixture and never contacts a source system.', notesInFlow: true,
  };
}

export function buildLegacyParityWorkflow(workflow, { starter = false } = {}) {
  const prefix = prefixFor(workflow.id);
  const trigger = triggerNode(workflow, prefix);
  const nodes = [
    trigger,
    {
      parameters: { assignments: { assignments: [
        { id: `${prefix}-cfg-1`, name: 'workflow_id', type: 'string', value: workflow.id },
        { id: `${prefix}-cfg-2`, name: 'workflow_name', type: 'string', value: workflow.name },
        { id: `${prefix}-cfg-3`, name: 'mode', type: 'string', value: starter ? 'starter' : 'production' },
        { id: `${prefix}-cfg-4`, name: 'trigger_type', type: 'string', value: trigger.type.includes('webhook') ? 'webhook' : 'schedule' },
        { id: `${prefix}-cfg-5`, name: 'dry_run', type: 'boolean', value: starter ? true : `={{ $env.${prefix}_DRY_RUN !== "false" }}` },
        { id: `${prefix}-cfg-6`, name: 'source_api_base_url', type: 'string', value: starter ? '' : `={{ $env.${prefix}_SOURCE_API_BASE_URL || "" }}` },
        { id: `${prefix}-cfg-7`, name: 'source_bearer_token', type: 'string', value: starter ? '' : `={{ $env.${prefix}_SOURCE_BEARER_TOKEN || "" }}` },
        { id: `${prefix}-cfg-8`, name: 'default_channel_id', type: 'string', value: starter ? '' : `={{ $env.${prefix}_DEFAULT_CHANNEL_ID || "" }}` },
        { id: `${prefix}-cfg-9`, name: 'summary_channel_id', type: 'string', value: starter ? '' : `={{ $env.${prefix}_SUMMARY_CHANNEL_ID || "" }}` },
        { id: `${prefix}-cfg-10`, name: 'lookback_days', type: 'number', value: starter ? 30 : `={{ Number($env.${prefix}_LOOKBACK_DAYS || 30) }}` },
        { id: `${prefix}-cfg-11`, name: 'max_records', type: 'number', value: starter ? 1 : `={{ Number($env.${prefix}_MAX_RECORDS || 100) }}` },
      ] }, options: {} },
      id: `${prefix.toLowerCase()}-config`, name: 'Workflow Configuration', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [-1080, 180],
    },
    {
      parameters: { assignments: { assignments: [
        { id: `${prefix}-src-1`, name: 'run_context', type: 'json', value: '={{ $json }}' },
        { id: `${prefix}-src-2`, name: 'source_system', type: 'string', value: `${workflow.id}-source` },
        { id: `${prefix}-src-3`, name: 'source_api_base_url', type: 'string', value: '={{ $json.source_api_base_url }}' },
        { id: `${prefix}-src-4`, name: 'source_bearer_token', type: 'string', value: '={{ $json.source_bearer_token }}' },
        { id: `${prefix}-src-5`, name: 'source_path', type: 'string', value: `/${workflow.id}/records` },
        { id: `${prefix}-src-6`, name: 'source_method', type: 'string', value: 'POST' },
        { id: `${prefix}-src-7`, name: 'source_body', type: 'json', value: '={{ { lookback_days: $json.lookback_days, limit: $json.max_records, exclude_processed: true, claim_unprocessed: true, trigger_payload: $json.body || null } }}' },
      ] }, options: {} },
      id: `${prefix.toLowerCase()}-contract`, name: 'Canonical Source Contract', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [-800, 180],
      notes: 'The source adapter owns connector-specific reads, canonical normalization, stable IDs, and processed-record claims.', notesInFlow: true,
    },
    sourceNode(workflow, prefix, starter),
    {
      parameters: { assignments: { assignments: [{
        id: `${prefix}-prompt-1`, name: 'agent_prompt', type: 'string',
        value: `=Return strict JSON only with keys headline, summary, findings, risks, recommended_actions, should_notify, and missing_data. findings, risks, recommended_actions, and missing_data must be arrays of short strings; should_notify must be boolean.

Workflow: ${workflow.name}
Purpose: ${workflow.description}

Run context:
{{ JSON.stringify($json.run_context || {}, null, 2) }}

Canonical source record:
{{ JSON.stringify($json.raw_record || $json, null, 2) }}

Use Backstory MCP only for factual enrichment and analysis. Never route, deliver, mutate source systems, or invent missing evidence. Make recommendations specific, concise, and appropriate for ${workflow.name}.`,
      }] }, options: {} },
      id: `${prefix.toLowerCase()}-prompt`, name: 'Build Structured Analysis Prompt', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [-240, 180],
    },
    {
      parameters: { promptType: 'define', text: '={{ $json.agent_prompt }}', options: { systemMessage: `You are the ${workflow.name} analyst. Use Backstory MCP only for enrichment. Return valid JSON; routing and delivery remain deterministic.` } },
      id: `${prefix.toLowerCase()}-agent`, name: `Analyze ${workflow.name}`, type: '@n8n/n8n-nodes-langchain.agent', typeVersion: 2, position: [40, 180],
    },
    {
      parameters: { model: { __rl: true, mode: 'list', value: 'claude-sonnet-4-6', cachedResultName: 'Claude Sonnet 4.6' }, options: {} },
      id: `${prefix.toLowerCase()}-model`, name: 'Anthropic Chat Model', type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', typeVersion: 1.3, position: [20, 420],
    },
    {
      parameters: { endpointUrl: 'https://mcp.people.ai/mcp', authentication: 'multipleHeadersAuth', options: {} },
      id: `${prefix.toLowerCase()}-mcp`, name: 'Backstory MCP', type: '@n8n/n8n-nodes-langchain.mcpClientTool', typeVersion: 1.1, position: [220, 420],
    },
    {
      parameters: { jsCode: `const item = $input.first().json;
const raw = item.output || item.text || item.response || '{}';
const cleaned = String(raw).trim().replace(/^\`\`\`json\\s*/i, '').replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
let result;
try { result = JSON.parse(cleaned); } catch { result = { headline: '${workflow.name}', summary: cleaned || 'Manual review required.', findings: [], risks: [], recommended_actions: ['Review the source record manually.'], should_notify: false, missing_data: ['Structured analysis unavailable.'] }; }
const list = (value) => Array.isArray(value) ? value.filter(Boolean).map(String) : [];
const section = (title, values) => values.length ? [title, ...values.map((value) => \`• \${value}\`)].join('\\n') : '';
const findings = list(result.findings); const risks = list(result.risks); const actions = list(result.recommended_actions); const missing = list(result.missing_data);
const body = [\`*\${result.headline || '${workflow.name}'}*\`, result.summary, section('*Findings*', findings), section('*Risks*', risks), section('*Recommended actions*', actions), missing.length ? \`_Missing data: \${missing.join('; ')}_\` : ''].filter(Boolean).join('\\n\\n');
const runContext = item.run_context || {}; const sourceId = item.source_id || item.raw_record?.id || 'record';
return [{ json: { ...item, workflow_id: '${workflow.id}', workflow_name: '${workflow.name}', run_context: runContext, should_notify: result.should_notify !== false, target_type: 'channel', target_id: item.route_channel_id || item.owner_slack_user_id || runContext.default_channel_id || '', delivery_title: result.headline || '${workflow.name}', delivery_body: body, delivery_format: 'mrkdwn', thread_key: '${workflow.id}:' + sourceId, dedupe_key: '${workflow.id}:' + sourceId, summary_channel_id: runContext.summary_channel_id || '', summary_detail: 'Processed ' + sourceId + ' for ${workflow.name}.' } }];` },
      id: `${prefix.toLowerCase()}-parse`, name: 'Parse Structured Analysis', type: 'n8n-nodes-base.code', typeVersion: 2, position: [320, 180],
    },
    { parameters: { workflowId: envWorkflowId('BACKSTORY_SHARED_IDENTITY_ROUTING_ID'), options: {} }, id: `${prefix.toLowerCase()}-identity`, name: 'Resolve Delivery Target', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.2, position: [600, 180] },
    { parameters: { workflowId: envWorkflowId('BACKSTORY_SHARED_DELIVERY_RENDERER_ID'), options: {} }, id: `${prefix.toLowerCase()}-render`, name: 'Render Delivery Payload', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.2, position: [880, 180] },
    {
      parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [
        { id: `${prefix}-gate-1`, leftValue: '={{ $json.run_context.dry_run }}', rightValue: '', operator: { type: 'boolean', operation: 'false', singleValue: true } },
        { id: `${prefix}-gate-2`, leftValue: '={{ $json.should_notify }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } },
        { id: `${prefix}-gate-3`, leftValue: '={{ $json.delivery_payload.target_id }}', rightValue: '', operator: { type: 'string', operation: 'notEmpty', singleValue: true } },
      ], combinator: 'and' }, options: {} },
      id: `${prefix.toLowerCase()}-gate`, name: 'Delivery Enabled?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [1160, 180],
    },
    {
      parameters: { authentication: 'oAuth2', select: 'channel', channelId: { __rl: true, mode: 'id', value: '={{ $json.delivery_payload.target_id }}' }, text: '={{ $json.delivery_payload.body }}', otherOptions: { unfurl_links: false } },
      id: `${prefix.toLowerCase()}-slack`, name: 'Post Workflow Result', type: 'n8n-nodes-base.slack', typeVersion: 2.3, position: [1440, 100],
    },
    { parameters: { workflowId: envWorkflowId('BACKSTORY_SHARED_RUN_SUMMARY_ID'), options: {} }, id: `${prefix.toLowerCase()}-summary`, name: 'Record Run Summary', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.2, position: [1720, 180] },
  ];

  const triggerName = trigger.name;
  return {
    name: starter ? `${workflow.name} — Demo Starter` : `${workflow.name} — Production Template`,
    description: `${workflow.description} Uses canonical source, identity, delivery, and observability contracts.`, active: false, settings: { executionOrder: 'v1' }, pinData: {},
    versionId: `${workflow.id}-${starter ? 'starter' : 'production'}-v3`, meta: { templateCredsSetupCompleted: false, demoStarter: starter }, id: `${workflow.id}-${starter ? 'starter' : 'production'}`,
    nodes,
    connections: {
      [triggerName]: { main: [[connection('Workflow Configuration')]] },
      'Workflow Configuration': { main: [[connection('Canonical Source Contract')]] },
      'Canonical Source Contract': { main: [[connection('Load Canonical Source Records')]] },
      'Load Canonical Source Records': { main: [[connection('Build Structured Analysis Prompt')]] },
      'Build Structured Analysis Prompt': { main: [[connection(`Analyze ${workflow.name}`)]] },
      'Anthropic Chat Model': { ai_languageModel: [[connection(`Analyze ${workflow.name}`, 'ai_languageModel')]] },
      'Backstory MCP': { ai_tool: [[connection(`Analyze ${workflow.name}`, 'ai_tool')]] },
      [`Analyze ${workflow.name}`]: { main: [[connection('Parse Structured Analysis')]] },
      'Parse Structured Analysis': { main: [[connection('Resolve Delivery Target')]] },
      'Resolve Delivery Target': { main: [[connection('Render Delivery Payload')]] },
      'Render Delivery Payload': { main: [[connection('Delivery Enabled?')]] },
      'Delivery Enabled?': { main: [[connection('Post Workflow Result')], [connection('Record Run Summary')]] },
      'Post Workflow Result': { main: [[connection('Record Run Summary')]] },
    },
  };
}

function sourceDoc(workflow, prefix) {
  return `# ${workflow.id.slice(0, 2)} — ${workflow.name}

## Overview

${workflow.description}

The production template uses canonical source, identity, delivery-rendering, and run-summary contracts. The model is limited to structured evidence analysis; source access, claims, routing, delivery, and observability are deterministic.

## Contracts

- \`run_context\`: mode, dry-run, source, lookback, and delivery defaults
- \`source_record\`: one canonical record with a stable source ID
- \`enrichment_context\`: Backstory MCP evidence used only during analysis
- \`delivery_payload\`: deterministic target, body, thread key, and dedupe key

## Production Configuration

- \`${prefix}_SOURCE_API_BASE_URL\`
- \`${prefix}_SOURCE_BEARER_TOKEN\`
- \`${prefix}_DEFAULT_CHANNEL_ID\`
- \`${prefix}_SUMMARY_CHANNEL_ID\`
- \`${prefix}_LOOKBACK_DAYS\`
- \`${prefix}_MAX_RECORDS\`
- \`${prefix}_DRY_RUN\`
- Shared source, identity, delivery renderer, and run-summary workflow IDs

## Safety

1. The source adapter owns stable IDs and processed-record claims.
2. The model returns JSON and cannot deliver or mutate systems.
3. Delivery requires dry-run off, notification eligibility, and a resolved target.
4. The starter uses a fictional fixture and cannot contact source or delivery systems by default.
`;
}

function recipeDoc(workflow) {
  return `# ${workflow.name} — Platform-Agnostic Recipe

## Reference Architecture

\`trigger -> canonical source adapter -> Backstory enrichment -> structured analysis -> identity resolution -> delivery renderer -> native delivery -> run summary\`

## Implementation Rules

1. Normalize connector-specific data into one canonical source record.
2. Use Backstory MCP only for enrichment and evidence analysis.
3. Require structured model output before deterministic routing.
4. Use stable source IDs, claims, and dedupe keys.
5. Keep dry-run enabled until representative source, routing, and delivery tests pass.

## Purpose

${workflow.description}
`;
}

export function rebuildLegacyParity(repoRoot = defaultRepoRoot) {
  const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'workflows.json'), 'utf8'));
  const updated = [];
  for (const id of LEGACY_PARITY_IDS) {
    const workflow = catalog.workflows.find((item) => item.id === id);
    if (!workflow) throw new Error(`Missing workflow metadata for ${id}`);
    const dir = path.join(repoRoot, id);
    const prefix = prefixFor(id);
    fs.writeFileSync(path.join(dir, 'full.json'), `${JSON.stringify(buildLegacyParityWorkflow(workflow), null, 2)}\n`);
    fs.writeFileSync(path.join(dir, 'starter.json'), `${JSON.stringify(buildLegacyParityWorkflow(workflow, { starter: true }), null, 2)}\n`);
    fs.writeFileSync(path.join(dir, 'SOURCE.md'), sourceDoc(workflow, prefix));
    fs.writeFileSync(path.join(dir, 'recipe-card.md'), recipeDoc(workflow));
    updated.push(id);
  }
  return { updated, workflowCount: updated.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(rebuildLegacyParity(), null, 2));
