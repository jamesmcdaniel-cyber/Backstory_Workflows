import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(__dirname, '..');
const envWorkflowId = (name) => ({ __rl: true, mode: 'id', value: `={{ $env.${name} || "" }}` });
const connection = (node, type = 'main', index = 0) => ({ node, type, index });

function configurationNode(starter) {
  return {
    parameters: {
      assignments: {
        assignments: [
          { id: 'ei-cfg-1', name: 'workflow_id', type: 'string', value: '06-executive-inbox' },
          { id: 'ei-cfg-2', name: 'workflow_name', type: 'string', value: 'Executive Inbox' },
          { id: 'ei-cfg-3', name: 'mode', type: 'string', value: starter ? 'starter' : 'production' },
          { id: 'ei-cfg-4', name: 'trigger_type', type: 'string', value: 'schedule' },
          { id: 'ei-cfg-5', name: 'lookback_hours', type: 'number', value: starter ? 24 : '={{ Number($env.EI_LOOKBACK_HOURS || 24) }}' },
          { id: 'ei-cfg-6', name: 'max_messages', type: 'number', value: starter ? 2 : '={{ Number($env.EI_MAX_MESSAGES || 50) }}' },
          { id: 'ei-cfg-7', name: 'claim_ttl_minutes', type: 'number', value: starter ? 15 : '={{ Number($env.EI_CLAIM_TTL_MINUTES || 15) }}' },
          { id: 'ei-cfg-8', name: 'dry_run', type: 'boolean', value: starter ? true : '={{ $env.EI_DRY_RUN !== "false" }}' },
          { id: 'ei-cfg-9', name: 'source_api_base_url', type: 'string', value: starter ? '' : '={{ $env.EI_SOURCE_API_BASE_URL || "" }}' },
          { id: 'ei-cfg-10', name: 'source_bearer_token', type: 'string', value: starter ? '' : '={{ $env.EI_SOURCE_BEARER_TOKEN || "" }}' },
          { id: 'ei-cfg-11', name: 'urgent_channel_id', type: 'string', value: starter ? '' : '={{ $env.EI_URGENT_CHANNEL_ID || "" }}' },
          { id: 'ei-cfg-12', name: 'followup_channel_id', type: 'string', value: starter ? '' : '={{ $env.EI_FOLLOWUP_CHANNEL_ID || "" }}' },
          { id: 'ei-cfg-13', name: 'default_channel_id', type: 'string', value: starter ? '' : '={{ $env.EI_DEFAULT_CHANNEL_ID || "" }}' },
          { id: 'ei-cfg-14', name: 'summary_channel_id', type: 'string', value: starter ? '' : '={{ $env.EI_SUMMARY_CHANNEL_ID || "" }}' },
        ],
      },
      options: {},
    },
    id: 'ei-configuration',
    name: 'Workflow Configuration',
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [-1080, 180],
  };
}

function sourceNode(starter) {
  if (!starter) {
    return {
      parameters: { workflowId: envWorkflowId('BACKSTORY_SHARED_SOURCE_ADAPTER_ID'), options: {} },
      id: 'ei-load-messages',
      name: 'Load Unread External Messages',
      type: 'n8n-nodes-base.executeWorkflow',
      typeVersion: 1.2,
      position: [-520, 180],
    };
  }
  return {
    parameters: {
      jsCode:
        "const runContext = $input.first().json.run_context || $input.first().json;\n" +
        "return [\n" +
        "  { json: { source_id: 'demo-email-1', owner: 'sarah.chen', account_name: 'Globex Industries', raw_record: { message_id: 'demo-email-1', sender_name: 'Dan Reeves', sender_email: 'dan.reeves@globex.example.test', sender_company: 'Globex Industries', subject: 'Need to discuss contract terms before Friday', body_preview: 'Can we talk today? We need alignment on the latest contract language before Friday.', received_at: '2026-07-13T14:05:00Z', account_owner_slack_user_id: '' }, run_context: runContext } },\n" +
        "  { json: { source_id: 'demo-email-2', owner: 'david.park', account_name: 'Initech', raw_record: { message_id: 'demo-email-2', sender_name: 'Priya Shah', sender_email: 'priya.shah@initech.example.test', sender_company: 'Initech', subject: 'Meeting confirmation', body_preview: 'Confirming our scheduled renewal sync next week.', received_at: '2026-07-13T14:20:00Z', account_owner_slack_user_id: '' }, run_context: runContext } }\n" +
        "];",
    },
    id: 'ei-load-messages',
    name: 'Load Unread External Messages',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [-520, 180],
    notes: 'Demo Starter: returns fictional email fixtures locally. It cannot read a mailbox or send notifications.',
    notesInFlow: true,
  };
}

export function buildExecutiveInboxWorkflow({ starter = false } = {}) {
  const nodes = [
    {
      parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] } },
      id: 'ei-schedule',
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
            { id: 'ei-src-1', name: 'run_context', type: 'json', value: '={{ $json }}' },
            { id: 'ei-src-2', name: 'source_system', type: 'string', value: 'executive_inbox' },
            { id: 'ei-src-3', name: 'source_api_base_url', type: 'string', value: '={{ $json.source_api_base_url }}' },
            { id: 'ei-src-4', name: 'source_bearer_token', type: 'string', value: '={{ $json.source_bearer_token }}' },
            { id: 'ei-src-5', name: 'source_path', type: 'string', value: '/executive-inbox/unread' },
            { id: 'ei-src-6', name: 'source_method', type: 'string', value: 'POST' },
            {
              id: 'ei-src-7',
              name: 'source_body',
              type: 'json',
              value: '={{ { lookback_hours: $json.lookback_hours, limit: $json.max_messages, unread_only: true, external_only: true, exclude_processed: true, claim_unprocessed: true, claim_ttl_minutes: $json.claim_ttl_minutes } }}',
            },
          ],
        },
        options: {},
      },
      id: 'ei-source-contract',
      name: 'Inbox Source Contract',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [-800, 180],
      notes: 'The source service must atomically lease unread external messages by stable message ID. Expired claims become eligible for retry.',
      notesInFlow: true,
    },
    sourceNode(starter),
    {
      parameters: {
        assignments: {
          assignments: [
            {
              id: 'ei-prompt-1',
              name: 'agent_prompt',
              type: 'string',
              value:
                '=Return strict JSON only with keys sender_name, sender_company, subject, urgency, category, account_context, reason, recommended_action, and missing_data. urgency must be urgent, follow_up, or informational. account_context and missing_data must be arrays of short strings.\n\n' +
                'Classify this external executive inbox message. Use Backstory MCP only to enrich account, opportunity, support, engagement, and relationship context. Never send messages, mutate email state, or select a channel ID.\n\n' +
                'Run context:\n{{ JSON.stringify($json.run_context || {}, null, 2) }}\n\n' +
                'Email record:\n{{ JSON.stringify($json.raw_record || $json, null, 2) }}\n\n' +
                'Rules:\n- urgent means immediate revenue, customer, legal, security, outage, or executive risk.\n- follow_up means a human should respond this week.\n- informational means no notification is necessary.\n- Classify from supported evidence only.\n- recommended_action must be one concrete next step.\n- Put unsupported or missing evidence in missing_data rather than inventing it.',
            },
          ],
        },
        options: {},
      },
      id: 'ei-build-prompt',
      name: 'Build Triage Prompt',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [-240, 180],
    },
    {
      parameters: {
        promptType: 'define',
        text: '={{ $json.agent_prompt }}',
        options: { systemMessage: 'You are an executive inbox triage analyst. Use Backstory MCP only for enrichment and return valid JSON. Routing and delivery remain deterministic.' },
      },
      id: 'ei-agent',
      name: 'Classify Executive Message',
      type: '@n8n/n8n-nodes-langchain.agent',
      typeVersion: 2,
      position: [40, 180],
    },
    {
      parameters: { model: { __rl: true, mode: 'list', value: 'claude-sonnet-4-6', cachedResultName: 'Claude Sonnet 4.6' }, options: {} },
      id: 'ei-anthropic',
      name: 'Anthropic Chat Model',
      type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
      typeVersion: 1.3,
      position: [20, 420],
    },
    {
      parameters: { endpointUrl: 'https://mcp.people.ai/mcp', authentication: 'multipleHeadersAuth', options: {} },
      id: 'ei-mcp',
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
          "let triage;\n" +
          "try { triage = JSON.parse(cleaned); } catch { triage = { sender_name: item.raw_record?.sender_name || 'Unknown sender', sender_company: item.account_name || '', subject: item.raw_record?.subject || 'Unread message', urgency: 'follow_up', category: 'manual_review', account_context: [], reason: 'The model response was not valid JSON.', recommended_action: 'Review the message manually.', missing_data: ['Structured classification unavailable.'] }; }\n" +
          "const allowed = ['urgent', 'follow_up', 'informational']; const urgency = allowed.includes(String(triage.urgency || '').toLowerCase()) ? String(triage.urgency).toLowerCase() : 'follow_up';\n" +
          "const list = (value) => Array.isArray(value) ? value.filter(Boolean).map(String) : []; const context = list(triage.account_context); const missing = list(triage.missing_data);\n" +
          "const labels = { urgent: '🔴 URGENT', follow_up: '🟡 FOLLOW UP', informational: '🟢 INFORMATIONAL' }; const source = item.raw_record || {}; const runContext = item.run_context || {};\n" +
          "const targetByUrgency = { urgent: runContext.urgent_channel_id, follow_up: runContext.followup_channel_id, informational: runContext.default_channel_id }; const targetId = source.account_owner_slack_user_id || targetByUrgency[urgency] || runContext.default_channel_id || '';\n" +
          "const body = [`📬 *${labels[urgency]} — ${triage.subject || source.subject || 'Executive message'}*`, `*From:* ${triage.sender_name || source.sender_name || source.sender_email || 'Unknown'}${triage.sender_company ? ` @ ${triage.sender_company}` : ''}`, triage.category ? `*Category:* ${triage.category}` : '', triage.reason ? `*Why it matters:* ${triage.reason}` : '', ...context.map((line) => `• ${line}`), triage.recommended_action ? `👉 *Next action:* ${triage.recommended_action}` : '', missing.length ? `_Missing data: ${missing.join('; ')}_` : ''].filter(Boolean).join('\\n');\n" +
          "const messageId = source.message_id || item.source_id || 'message'; const shouldNotify = urgency !== 'informational';\n" +
          "return [{ json: { ...item, workflow_id: '06-executive-inbox', workflow_name: 'Executive Inbox', run_context: runContext, urgency, category: triage.category || 'uncategorized', should_notify: shouldNotify, target_type: source.account_owner_slack_user_id ? 'user' : 'channel', target_id: targetId, delivery_title: `${labels[urgency]} — ${triage.subject || source.subject || 'Executive message'}`, delivery_body: body, delivery_format: 'mrkdwn', thread_key: `executive-inbox:${messageId}`, dedupe_key: `06-executive-inbox:${messageId}`, summary_channel_id: runContext.summary_channel_id || '', summary_detail: `${urgency} message ${messageId} classified${shouldNotify ? ' for notification' : ' without notification'}.` } }];",
      },
      id: 'ei-parse',
      name: 'Parse Structured Triage',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [320, 180],
    },
    {
      parameters: { workflowId: envWorkflowId('BACKSTORY_SHARED_IDENTITY_ROUTING_ID'), options: {} },
      id: 'ei-resolve-target',
      name: 'Resolve Delivery Target',
      type: 'n8n-nodes-base.executeWorkflow',
      typeVersion: 1.2,
      position: [600, 180],
    },
    {
      parameters: { workflowId: envWorkflowId('BACKSTORY_SHARED_DELIVERY_RENDERER_ID'), options: {} },
      id: 'ei-render-delivery',
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
            { id: 'ei-gate-1', leftValue: '={{ $json.run_context.dry_run }}', rightValue: '', operator: { type: 'boolean', operation: 'false', singleValue: true } },
            { id: 'ei-gate-2', leftValue: '={{ $json.should_notify }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } },
            { id: 'ei-gate-3', leftValue: '={{ $json.delivery_payload.target_id }}', rightValue: '', operator: { type: 'string', operation: 'notEmpty', singleValue: true } },
          ],
          combinator: 'and',
        },
        options: {},
      },
      id: 'ei-delivery-gate',
      name: 'Notification Enabled?',
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
      id: 'ei-post-slack',
      name: 'Post Triage Notification',
      type: 'n8n-nodes-base.slack',
      typeVersion: 2.3,
      position: [1440, 100],
    },
    {
      parameters: { workflowId: envWorkflowId('BACKSTORY_SHARED_RUN_SUMMARY_ID'), options: {} },
      id: 'ei-run-summary',
      name: 'Record Run Summary',
      type: 'n8n-nodes-base.executeWorkflow',
      typeVersion: 1.2,
      position: [1720, 180],
    },
  ];

  const connections = {
    'Schedule Trigger': { main: [[connection('Workflow Configuration')]] },
    'Workflow Configuration': { main: [[connection('Inbox Source Contract')]] },
    'Inbox Source Contract': { main: [[connection('Load Unread External Messages')]] },
    'Load Unread External Messages': { main: [[connection('Build Triage Prompt')]] },
    'Build Triage Prompt': { main: [[connection('Classify Executive Message')]] },
    'Anthropic Chat Model': { ai_languageModel: [[connection('Classify Executive Message', 'ai_languageModel')]] },
    'Backstory MCP': { ai_tool: [[connection('Classify Executive Message', 'ai_tool')]] },
    'Classify Executive Message': { main: [[connection('Parse Structured Triage')]] },
    'Parse Structured Triage': { main: [[connection('Resolve Delivery Target')]] },
    'Resolve Delivery Target': { main: [[connection('Render Delivery Payload')]] },
    'Render Delivery Payload': { main: [[connection('Notification Enabled?')]] },
    'Notification Enabled?': { main: [[connection('Post Triage Notification')], [connection('Record Run Summary')]] },
    'Post Triage Notification': { main: [[connection('Record Run Summary')]] },
  };

  return {
    name: starter ? 'Executive Inbox — Demo Starter' : 'Executive Inbox — Production Template',
    description: 'Triages leased unread external messages with bounded Backstory enrichment, deterministic urgency routing, shared delivery contracts, and native Slack notifications.',
    active: false,
    settings: { executionOrder: 'v1' },
    pinData: {},
    versionId: starter ? '06-executive-inbox-starter-v3' : '06-executive-inbox-production-v3',
    meta: { templateCredsSetupCompleted: false, demoStarter: starter },
    id: starter ? '06-executive-inbox-starter' : '06-executive-inbox-production',
    nodes,
    connections,
  };
}

const sourceDoc = `# 06 — Executive Inbox

## Overview

The production template polls an inbox source contract for atomically leased unread external messages. Backstory MCP is limited to evidence enrichment and classification; urgency-to-channel mapping, notification eligibility, delivery, and observability are deterministic.

## Attached Platform Assets

- \`full.json\`: production n8n template
- \`starter.json\`: fixture-backed, dry-run-safe demo
- \`workato-guide.pdf\`: Workato implementation guide
- \`zapier-guide.pdf\`: Zapier implementation guide

## Contracts

- \`run_context\`: polling window, lease duration, dry-run, source, and routing destinations
- \`source_record\`: one unread external message with a stable message ID and sender metadata
- \`enrichment_context\`: Backstory MCP evidence used only during classification
- \`delivery_payload\`: deterministic recipient, triage body, thread key, and dedupe key

## Production Configuration

- \`EI_SOURCE_API_BASE_URL\`
- \`EI_SOURCE_BEARER_TOKEN\`
- \`EI_URGENT_CHANNEL_ID\`
- \`EI_FOLLOWUP_CHANNEL_ID\`
- \`EI_DEFAULT_CHANNEL_ID\`
- \`EI_SUMMARY_CHANNEL_ID\`
- \`EI_LOOKBACK_HOURS\`
- \`EI_MAX_MESSAGES\`
- \`EI_CLAIM_TTL_MINUTES\`
- \`EI_DRY_RUN\` (notifications remain disabled unless explicitly set to \`false\`)
- Shared source, identity routing, delivery renderer, and run-summary workflow IDs

## Design Rules

1. The source service atomically leases stable message IDs; expired leases are retryable.
2. Only unread external messages enter the classification path.
3. The model classifies evidence but cannot select channel IDs or perform side effects.
4. Urgent, follow-up, and informational routing is deterministic from environment config.
5. Informational messages are summarized without notification.
6. Native Slack delivery requires dry-run off, notification eligibility, and a target.
7. The starter uses fictional messages and cannot read an inbox or deliver by default.

## Required Shared Sub-workflows

- Shared — Source Adapter
- Shared — Identity And Channel Resolution
- Shared — Delivery Renderer
- Shared — Run Summary And Observability
`;

const recipeDoc = `# Executive Inbox — Platform-Agnostic Recipe

## Reference Architecture

\`schedule -> leased external-message source -> Backstory enrichment -> structured triage -> deterministic urgency route -> delivery renderer -> native notification -> run summary\`

## Production Implementation Notes

- Atomically lease unread external messages by stable ID to prevent duplicate alerts.
- Expire abandoned leases so failed runs can retry safely.
- Keep Backstory MCP calls inside the bounded classification step.
- Require structured urgency/category output before routing.
- Map urgency to configured destinations outside the model.
- Suppress informational notifications while retaining observability.
- Keep dry-run enabled until inbox, routing, and representative delivery tests pass.

## Agent Boundary

The agent classifies evidence and recommends an action. Mailbox access, leasing, dedupe, channel selection, notification eligibility, formatting, delivery, and observability are deterministic components.
`;

export function rebuildExecutiveInboxParity(repoRoot = defaultRepoRoot) {
  const dir = path.join(repoRoot, '06-executive-inbox');
  fs.writeFileSync(path.join(dir, 'full.json'), `${JSON.stringify(buildExecutiveInboxWorkflow(), null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'starter.json'), `${JSON.stringify(buildExecutiveInboxWorkflow({ starter: true }), null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'SOURCE.md'), sourceDoc);
  fs.writeFileSync(path.join(dir, 'recipe-card.md'), recipeDoc);
  return { workflowId: '06-executive-inbox', variants: ['full.json', 'starter.json'] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(rebuildExecutiveInboxParity(), null, 2));
}
