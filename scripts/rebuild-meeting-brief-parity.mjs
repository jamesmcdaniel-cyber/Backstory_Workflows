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
          { id: 'mb-cfg-1', name: 'workflow_id', type: 'string', value: '02-meeting-brief' },
          { id: 'mb-cfg-2', name: 'workflow_name', type: 'string', value: 'Meeting Brief' },
          { id: 'mb-cfg-3', name: 'mode', type: 'string', value: starter ? 'starter' : 'production' },
          { id: 'mb-cfg-4', name: 'trigger_type', type: 'string', value: 'schedule' },
          { id: 'mb-cfg-5', name: 'window_minutes', type: 'number', value: starter ? 30 : '={{ Number($env.MB_WINDOW_MINUTES || 30) }}' },
          { id: 'mb-cfg-6', name: 'lookback_days', type: 'number', value: starter ? 45 : '={{ Number($env.MB_LOOKBACK_DAYS || 45) }}' },
          { id: 'mb-cfg-7', name: 'max_meetings', type: 'number', value: starter ? 2 : '={{ Number($env.MB_MAX_MEETINGS || 25) }}' },
          { id: 'mb-cfg-8', name: 'dry_run', type: 'boolean', value: starter ? true : '={{ $env.MB_DRY_RUN !== "false" }}' },
          { id: 'mb-cfg-9', name: 'source_api_base_url', type: 'string', value: starter ? '' : '={{ $env.MB_SOURCE_API_BASE_URL || "" }}' },
          { id: 'mb-cfg-10', name: 'source_bearer_token', type: 'string', value: starter ? '' : '={{ $env.MB_SOURCE_BEARER_TOKEN || "" }}' },
          { id: 'mb-cfg-11', name: 'default_channel_id', type: 'string', value: starter ? '' : '={{ $env.MB_DEFAULT_CHANNEL_ID || "" }}' },
          { id: 'mb-cfg-12', name: 'summary_channel_id', type: 'string', value: starter ? '' : '={{ $env.MB_SUMMARY_CHANNEL_ID || "" }}' },
        ],
      },
      options: {},
    },
    id: 'mb-configuration',
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
      id: 'mb-load-meetings',
      name: 'Load Upcoming Meetings',
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
        "  { json: { source_id: 'demo-meeting-1', owner: 'sarah.chen', account_name: 'Globex Industries', raw_record: { meeting_id: 'demo-meeting-1', title: 'Globex technical review', starts_at: '2026-07-13T20:00:00Z', owner_name: 'Sarah Chen', owner_slack_user_id: '', account_name: 'Globex Industries', attendees: [{ name: 'Dan Reeves', role: 'VP Engineering', external: true }, { name: 'Lisa Wong', role: 'Director of IT', external: true }], already_briefed: false }, run_context: runContext } },\n" +
        "  { json: { source_id: 'demo-meeting-2', owner: 'david.park', account_name: 'Initech', raw_record: { meeting_id: 'demo-meeting-2', title: 'Initech renewal sync', starts_at: '2026-07-13T21:00:00Z', owner_name: 'David Park', owner_slack_user_id: '', account_name: 'Initech', attendees: [{ name: 'Priya Shah', role: 'Procurement Director', external: true }], already_briefed: false }, run_context: runContext } }\n" +
        "];",
    },
    id: 'mb-load-meetings',
    name: 'Load Upcoming Meetings',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [-520, 180],
    notes: 'Demo Starter: returns fictional upcoming meetings locally. It never reads a calendar or sends a brief.',
    notesInFlow: true,
  };
}

export function buildMeetingBriefWorkflow({ starter = false } = {}) {
  const nodes = [
    {
      parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 15 }] } },
      id: 'mb-schedule',
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
            { id: 'mb-src-1', name: 'run_context', type: 'json', value: '={{ $json }}' },
            { id: 'mb-src-2', name: 'source_system', type: 'string', value: 'upcoming_external_meetings' },
            { id: 'mb-src-3', name: 'source_api_base_url', type: 'string', value: '={{ $json.source_api_base_url }}' },
            { id: 'mb-src-4', name: 'source_bearer_token', type: 'string', value: '={{ $json.source_bearer_token }}' },
            { id: 'mb-src-5', name: 'source_path', type: 'string', value: '/meeting-brief/upcoming' },
            { id: 'mb-src-6', name: 'source_method', type: 'string', value: 'POST' },
            {
              id: 'mb-src-7',
              name: 'source_body',
              type: 'json',
              value: '={{ { window_minutes: $json.window_minutes, max_meetings: $json.max_meetings, external_only: true, exclude_briefed: true } }}',
            },
          ],
        },
        options: {},
      },
      id: 'mb-source-contract',
      name: 'Meeting Source Contract',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [-800, 180],
      notes: 'The source adapter must return only external meetings inside the briefing window and suppress meeting IDs already briefed.',
      notesInFlow: true,
    },
    sourceNode(starter),
    {
      parameters: {
        assignments: {
          assignments: [
            {
              id: 'mb-prompt-1',
              name: 'agent_prompt',
              type: 'string',
              value:
                '=Return strict JSON only with keys meeting_title, meeting_time, attendees, account_context, talking_points, watch_for, and missing_data. attendees, account_context, talking_points, watch_for, and missing_data must be arrays of short strings.\n\n' +
                'Create a pre-meeting brief from this canonical meeting record. Use Backstory MCP only to enrich account, opportunity, engagement, and stakeholder context. Never send a message or mutate a source system.\n\n' +
                'Run context:\n{{ JSON.stringify($json.run_context || {}, null, 2) }}\n\n' +
                'Meeting record:\n{{ JSON.stringify($json.raw_record || $json, null, 2) }}\n\n' +
                'Rules:\n- Use only evidence available in the record or Backstory MCP.\n- Identify attendee roles and engagement history when supported.\n- Prioritize 3-5 concrete talking points.\n- Surface deal risks, missing stakeholders, and deadlines in watch_for.\n- Put unsupported or missing evidence in missing_data instead of inventing it.\n- Keep every item concise enough for Slack.',
            },
          ],
        },
        options: {},
      },
      id: 'mb-build-prompt',
      name: 'Build Meeting Brief Prompt',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [-240, 180],
    },
    {
      parameters: {
        promptType: 'define',
        text: '={{ $json.agent_prompt }}',
        options: { systemMessage: 'You are a pre-meeting sales intelligence analyst. Use Backstory MCP only for enrichment and return valid JSON. Routing and delivery are deterministic.' },
      },
      id: 'mb-agent',
      name: 'Generate Meeting Brief',
      type: '@n8n/n8n-nodes-langchain.agent',
      typeVersion: 2,
      position: [40, 180],
    },
    {
      parameters: {
        model: { __rl: true, mode: 'list', value: 'claude-sonnet-4-6', cachedResultName: 'Claude Sonnet 4.6' },
        options: {},
      },
      id: 'mb-anthropic',
      name: 'Anthropic Chat Model',
      type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
      typeVersion: 1.3,
      position: [20, 420],
    },
    {
      parameters: { endpointUrl: 'https://mcp.people.ai/mcp', authentication: 'multipleHeadersAuth', options: {} },
      id: 'mb-mcp',
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
          "let brief;\n" +
          "try { brief = JSON.parse(cleaned); } catch { brief = { meeting_title: item.raw_record?.title || 'Upcoming meeting', meeting_time: item.raw_record?.starts_at || '', attendees: [], account_context: [], talking_points: ['Review the meeting record manually.'], watch_for: [], missing_data: ['The model response was not valid JSON.'] }; }\n" +
          "const list = (value) => Array.isArray(value) ? value.filter(Boolean).map(String) : [];\n" +
          "const section = (title, values) => values.length ? [title, ...values.map((value) => `• ${value}`)].join('\\n') : '';\n" +
          "const attendees = list(brief.attendees); const context = list(brief.account_context); const talking = list(brief.talking_points); const watch = list(brief.watch_for); const missing = list(brief.missing_data);\n" +
          "const heading = `📋 *Meeting Brief — ${brief.meeting_title || item.raw_record?.title || 'Upcoming meeting'}*${brief.meeting_time ? ` | ${brief.meeting_time}` : ''}`;\n" +
          "const body = [heading, section('*Attendees*', attendees), section('*Account context*', context), section('*Talking points*', talking), section('*Watch for*', watch), missing.length ? `_Missing data: ${missing.join('; ')}_` : ''].filter(Boolean).join('\\n\\n');\n" +
          "const source = item.raw_record || {}; const runContext = item.run_context || {}; const meetingId = source.meeting_id || item.source_id || 'meeting';\n" +
          "return [{ json: { ...item, workflow_id: '02-meeting-brief', workflow_name: 'Meeting Brief', run_context: runContext, target_type: source.owner_slack_user_id ? 'user' : 'channel', target_id: source.owner_slack_user_id || source.slack_channel_id || runContext.default_channel_id || '', delivery_title: brief.meeting_title || source.title || 'Meeting Brief', delivery_body: body, delivery_format: 'mrkdwn', thread_key: `meeting-brief:${meetingId}`, dedupe_key: `02-meeting-brief:${meetingId}`, summary_channel_id: runContext.summary_channel_id || '', summary_detail: `Prepared brief for ${source.owner_name || item.owner || 'meeting owner'}; dedupe key ${meetingId}.` } }];",
      },
      id: 'mb-parse',
      name: 'Parse Structured Brief',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [320, 180],
    },
    {
      parameters: { workflowId: envWorkflowId('BACKSTORY_SHARED_IDENTITY_ROUTING_ID'), options: {} },
      id: 'mb-resolve-target',
      name: 'Resolve Delivery Target',
      type: 'n8n-nodes-base.executeWorkflow',
      typeVersion: 1.2,
      position: [600, 180],
    },
    {
      parameters: { workflowId: envWorkflowId('BACKSTORY_SHARED_DELIVERY_RENDERER_ID'), options: {} },
      id: 'mb-render-delivery',
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
            { id: 'mb-gate-1', leftValue: '={{ $json.run_context.dry_run }}', rightValue: '', operator: { type: 'boolean', operation: 'false', singleValue: true } },
            { id: 'mb-gate-2', leftValue: '={{ $json.delivery_payload.target_id }}', rightValue: '', operator: { type: 'string', operation: 'notEmpty', singleValue: true } },
          ],
          combinator: 'and',
        },
        options: {},
      },
      id: 'mb-delivery-gate',
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
      id: 'mb-post-slack',
      name: 'Send Meeting Brief',
      type: 'n8n-nodes-base.slack',
      typeVersion: 2.3,
      position: [1440, 100],
    },
    {
      parameters: { workflowId: envWorkflowId('BACKSTORY_SHARED_RUN_SUMMARY_ID'), options: {} },
      id: 'mb-run-summary',
      name: 'Record Run Summary',
      type: 'n8n-nodes-base.executeWorkflow',
      typeVersion: 1.2,
      position: [1720, 180],
    },
  ];

  const connections = {
    'Schedule Trigger': { main: [[connection('Workflow Configuration')]] },
    'Workflow Configuration': { main: [[connection('Meeting Source Contract')]] },
    'Meeting Source Contract': { main: [[connection('Load Upcoming Meetings')]] },
    'Load Upcoming Meetings': { main: [[connection('Build Meeting Brief Prompt')]] },
    'Build Meeting Brief Prompt': { main: [[connection('Generate Meeting Brief')]] },
    'Anthropic Chat Model': { ai_languageModel: [[connection('Generate Meeting Brief', 'ai_languageModel')]] },
    'Backstory MCP': { ai_tool: [[connection('Generate Meeting Brief', 'ai_tool')]] },
    'Generate Meeting Brief': { main: [[connection('Parse Structured Brief')]] },
    'Parse Structured Brief': { main: [[connection('Resolve Delivery Target')]] },
    'Resolve Delivery Target': { main: [[connection('Render Delivery Payload')]] },
    'Render Delivery Payload': { main: [[connection('Delivery Enabled?')]] },
    'Delivery Enabled?': { main: [[connection('Send Meeting Brief')], [connection('Record Run Summary')]] },
    'Send Meeting Brief': { main: [[connection('Record Run Summary')]] },
  };

  return {
    name: starter ? 'Meeting Brief — Demo Starter' : 'Meeting Brief — Production Template',
    description: 'Prepares evidence-grounded briefs for upcoming external meetings using shared source, identity, delivery, and observability contracts with native Slack delivery.',
    active: false,
    settings: { executionOrder: 'v1' },
    pinData: {},
    versionId: starter ? '02-meeting-brief-starter-v3' : '02-meeting-brief-production-v3',
    meta: { templateCredsSetupCompleted: false, demoStarter: starter },
    id: starter ? '02-meeting-brief-starter' : '02-meeting-brief-production',
    nodes,
    connections,
  };
}

const sourceDoc = `# 02 — Meeting Brief

## Overview

The production template polls a shared meeting-source contract every 15 minutes for upcoming external meetings that have not already been briefed. Backstory MCP is limited to evidence enrichment and structured synthesis; identity resolution, formatting, delivery, dedupe ownership, and observability remain deterministic.

## Attached Platform Assets

- \`full.json\`: production n8n template
- \`starter.json\`: fixture-backed, dry-run-safe demo
- \`workato-guide.pdf\`: Workato implementation guide
- \`zapier-guide.pdf\`: Zapier implementation guide

## Contracts

- \`run_context\`: briefing window, lookback, mode, dry-run, source, and delivery defaults
- \`source_record\`: one external meeting with stable meeting ID, owner, account, time, and attendees
- \`enrichment_context\`: Backstory MCP evidence used only during synthesis
- \`delivery_payload\`: deterministic recipient, brief body, meeting thread key, and dedupe key

## Production Configuration

- \`MB_SOURCE_API_BASE_URL\`
- \`MB_SOURCE_BEARER_TOKEN\`
- \`MB_DEFAULT_CHANNEL_ID\`
- \`MB_SUMMARY_CHANNEL_ID\`
- \`MB_WINDOW_MINUTES\`
- \`MB_LOOKBACK_DAYS\`
- \`MB_MAX_MEETINGS\`
- \`MB_DRY_RUN\` (delivery remains disabled unless explicitly set to \`false\`)
- Shared source, identity routing, delivery renderer, and run-summary workflow IDs

## Design Rules

1. The source adapter owns calendar normalization, external-attendee filtering, and already-briefed suppression.
2. Every meeting needs a stable source ID for deduplication.
3. The model returns strict JSON and never performs delivery side effects.
4. Unsupported claims are reported as missing data instead of invented.
5. Native Slack delivery runs only when dry-run is false and a target is present.
6. The starter uses fictional fixtures and cannot contact a calendar or deliver by default.

## Required Shared Sub-workflows

- Shared — Source Adapter
- Shared — Identity And Channel Resolution
- Shared — Delivery Renderer
- Shared — Run Summary And Observability
`;

const recipeDoc = `# Meeting Brief — Platform-Agnostic Recipe

## Reference Architecture

\`schedule -> upcoming-meeting source adapter -> Backstory enrichment -> structured brief -> identity resolution -> delivery renderer -> native delivery -> run summary\`

## Production Implementation Notes

- Return one canonical meeting record per external meeting inside the configured window.
- Suppress stable meeting IDs that have already produced a brief.
- Keep Backstory MCP calls inside the bounded synthesis step.
- Require structured output before formatting or delivery.
- Resolve the meeting owner through shared identity configuration, never model output.
- Keep dry-run enabled until calendar, identity, and representative delivery tests pass.

## Agent Boundary

The agent identifies evidence, talking points, and risks. Calendar access, eligibility filtering, dedupe, recipient resolution, formatting, delivery, and observability are deterministic components.
`;

export function rebuildMeetingBriefParity(repoRoot = defaultRepoRoot) {
  const dir = path.join(repoRoot, '02-meeting-brief');
  fs.writeFileSync(path.join(dir, 'full.json'), `${JSON.stringify(buildMeetingBriefWorkflow(), null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'starter.json'), `${JSON.stringify(buildMeetingBriefWorkflow({ starter: true }), null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'SOURCE.md'), sourceDoc);
  fs.writeFileSync(path.join(dir, 'recipe-card.md'), recipeDoc);
  return { workflowId: '02-meeting-brief', variants: ['full.json', 'starter.json'] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(rebuildMeetingBriefParity(), null, 2));
}
