import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(__dirname, '..');

const SHARED_SOURCE_ADAPTER_ID = '={{ $env.BACKSTORY_SHARED_SOURCE_ADAPTER_ID || "" }}';
const SHARED_IDENTITY_ROUTING_ID = '={{ $env.BACKSTORY_SHARED_IDENTITY_ROUTING_ID || "" }}';
const SHARED_DELIVERY_RENDERER_ID = '={{ $env.BACKSTORY_SHARED_DELIVERY_RENDERER_ID || "" }}';

const writeJson = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
const writeText = (target, value) => fs.writeFileSync(target, `${value.trimStart()}\n`);

const makeBaseWorkflow = ({ id, name, description, tags = [], nodes, connections }) => ({
  name,
  description,
  active: false,
  settings: {},
  pinData: {},
  versionId: `${id}-v2`,
  meta: {
    templateCredsSetupCompleted: false,
  },
  id,
  tags,
  nodes,
  connections,
});

function buildOpportunityDiscoveryWorkflow({ starter = false }) {
  const mode = starter ? 'starter' : 'production';
  const sourcePath = starter ? '/opportunity-discovery/starter-candidates' : '/opportunity-discovery/candidates';

  return makeBaseWorkflow({
    id: starter ? '04-opportunity-discovery-starter' : '04-opportunity-discovery-production',
    name: starter
      ? 'Opportunity Discovery — Demo Starter'
      : 'Opportunity Discovery — Production Template',
    description:
      'Refactored Opportunity Discovery workflow that relies on a shared source adapter for candidate-account normalization, uses one bounded agentic synthesis pass for buying-signal scoring, and delivers deterministic Slack and email digests without raw transport API calls.',
    tags: ['pipeline-forecasting', 'n8n', starter ? 'starter' : 'production', 'reference'],
    nodes: [
      {
        parameters: {
          rule: {
            interval: [
              {
                field: 'cronExpression',
                expression: '0 8 * * 1',
              },
            ],
          },
        },
        id: 'od-schedule-trigger',
        name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1.2,
        position: [-1160, 120],
      },
      {
        parameters: {
          assignments: {
            assignments: [
              { id: 'od-ctx-1', name: 'workflow_id', type: 'string', value: '04-opportunity-discovery' },
              { id: 'od-ctx-2', name: 'workflow_name', type: 'string', value: 'Opportunity Discovery' },
              { id: 'od-ctx-3', name: 'mode', type: 'string', value: mode },
              { id: 'od-ctx-4', name: 'trigger_type', type: 'string', value: 'schedule' },
              { id: 'od-ctx-5', name: 'lookback_days', type: 'number', value: 14 },
              { id: 'od-ctx-6', name: 'delivery_mode', type: 'string', value: 'slack_and_email' },
              {
                id: 'od-ctx-7',
                name: 'dry_run',
                type: 'boolean',
                value: starter ? true : '={{ $env.OD_DRY_RUN === "true" }}',
              },
              {
                id: 'od-ctx-8',
                name: 'source_api_base_url',
                type: 'string',
                value: starter
                  ? '={{ $env.OD_STARTER_SOURCE_API_BASE_URL || "https://demo.backstory.local" }}'
                  : '={{ $env.OD_SOURCE_API_BASE_URL || "" }}',
              },
              {
                id: 'od-ctx-9',
                name: 'default_channel_id',
                type: 'string',
                value: starter
                  ? '={{ $env.OD_STARTER_CHANNEL_ID || "YOUR_SLACK_CHANNEL_ID" }}'
                  : '={{ $env.OD_DEFAULT_CHANNEL_ID || "" }}',
              },
              {
                id: 'od-ctx-10',
                name: 'summary_email',
                type: 'string',
                value: starter
                  ? '={{ $env.OD_STARTER_SUMMARY_EMAIL || "demo@example.com" }}'
                  : '={{ $env.OD_SUMMARY_EMAIL || "" }}',
              },
              {
                id: 'od-ctx-11',
                name: 'from_email',
                type: 'string',
                value: '={{ $env.BACKSTORY_NO_REPLY_EMAIL || "success@backstory.ai" }}',
              },
              {
                id: 'od-ctx-12',
                name: 'engagement_threshold',
                type: 'number',
                value: starter ? 35 : '={{ Number($env.OD_ENGAGEMENT_THRESHOLD || 50) }}',
              },
              {
                id: 'od-ctx-13',
                name: 'max_accounts',
                type: 'number',
                value: starter ? 5 : '={{ Number($env.OD_MAX_ACCOUNTS || 25) }}',
              },
            ],
          },
          options: {},
        },
        id: 'od-config',
        name: 'Workflow Configuration',
        type: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        position: [-900, 120],
      },
      {
        parameters: {
          assignments: {
            assignments: [
              { id: 'od-src-1', name: 'run_context', type: 'json', value: '={{ $json }}' },
              { id: 'od-src-2', name: 'source_system', type: 'string', value: 'opportunity_discovery_source' },
              { id: 'od-src-3', name: 'source_path', type: 'string', value: sourcePath },
              { id: 'od-src-4', name: 'source_method', type: 'string', value: 'POST' },
              {
                id: 'od-src-5',
                name: 'source_body',
                type: 'json',
                value:
                  '={{ { lookback_days: $json.lookback_days, engagement_threshold: $json.engagement_threshold, max_accounts: $json.max_accounts, mode: $json.mode, dry_run: $json.dry_run } }}',
              },
              { id: 'od-src-6', name: 'default_channel_id', type: 'string', value: '={{ $json.default_channel_id }}' },
              { id: 'od-src-7', name: 'summary_email', type: 'string', value: '={{ $json.summary_email }}' },
              { id: 'od-src-8', name: 'from_email', type: 'string', value: '={{ $json.from_email }}' },
            ],
          },
          options: {},
        },
        id: 'od-source-contract',
        name: 'Candidate Source Contract',
        type: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        position: [-620, 120],
      },
      {
        parameters: {
          workflowId: {
            __rl: true,
            mode: 'id',
            value: SHARED_SOURCE_ADAPTER_ID,
          },
          options: {},
        },
        id: 'od-source-adapter',
        name: 'Load Candidate Inputs',
        type: 'n8n-nodes-base.executeWorkflow',
        typeVersion: 1.2,
        position: [-340, 120],
      },
      {
        parameters: {
          assignments: {
            assignments: [
              {
                id: 'od-prompt-1',
                name: 'agent_prompt',
                type: 'string',
                value:
                  '=Return strict JSON only with keys account_name, confidence, estimated_amount, signal_summary, evidence, recommended_action, should_alert, and owner_name.\\n\\n' +
                  'You are scoring hidden pipeline opportunities. Use MCP only for enrichment and analysis, not for delivery or routing.\\n\\n' +
                  'Run context:\\n{{ JSON.stringify($json.run_context || {}, null, 2) }}\\n\\n' +
                  'Source record:\\n{{ JSON.stringify($json.raw_record || $json, null, 2) }}\\n\\n' +
                  'Rules:\\n' +
                  '- Set should_alert=true only when there is credible buying intent without an active open opportunity.\\n' +
                  '- confidence must be high, medium, or low.\\n' +
                  '- evidence must be an array of short factual bullets.\\n' +
                  '- recommended_action must be one clear next step for the owner.\\n' +
                  '- Keep signal_summary under 220 characters.',
              },
            ],
          },
          options: {},
        },
        id: 'od-build-prompt',
        name: 'Build Discovery Prompt',
        type: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        position: [-60, 120],
      },
      {
        parameters: {
          promptType: 'define',
          text: '={{ $json.agent_prompt }}',
          options: {
            systemMessage:
              'You are a pipeline-forecasting analyst. Use Backstory MCP only for enrichment. Output JSON only and keep all delivery deterministic.',
          },
        },
        id: 'od-agent',
        name: 'Generate Opportunity Analysis',
        type: '@n8n/n8n-nodes-langchain.agent',
        typeVersion: 2,
        position: [220, 120],
      },
      {
        parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'claude-sonnet-4-5-20250929',
            cachedResultName: 'Claude Sonnet 4.5',
          },
          options: {},
        },
        id: 'od-model',
        name: 'Anthropic Chat Model',
        type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
        typeVersion: 1.3,
        position: [220, 320],
      },
      {
        parameters: {
          endpointUrl: 'https://mcp.people.ai/mcp',
          authentication: 'multipleHeadersAuth',
          options: {},
        },
        id: 'od-mcp',
        name: 'Backstory MCP',
        type: '@n8n/n8n-nodes-langchain.mcpClientTool',
        typeVersion: 1,
        position: [500, 320],
      },
      {
        parameters: {
          jsCode:
            "const item = $input.first().json;\n" +
            "const raw = item.output || item.text || item.response || item.message || '{}';\n" +
            "const cleaned = String(raw).trim().replace(/^```json\\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();\n" +
            "let parsed;\n" +
            "try {\n" +
            "  parsed = JSON.parse(cleaned);\n" +
            "} catch (error) {\n" +
            "  parsed = {\n" +
            "    account_name: item.account_name || item.accountName || item.recordSummary || 'Unknown Account',\n" +
            "    confidence: 'low',\n" +
            "    estimated_amount: item.estimated_amount || 0,\n" +
            "    signal_summary: cleaned || 'No structured analysis returned.',\n" +
            "    evidence: [],\n" +
            "    recommended_action: 'Review the source record manually.',\n" +
            "    should_alert: false,\n" +
            "    owner_name: item.owner || item.accountOwner || ''\n" +
            "  };\n" +
            "}\n" +
            "const confidence = ['high', 'medium', 'low'].includes(String(parsed.confidence || '').toLowerCase())\n" +
            "  ? String(parsed.confidence).toLowerCase()\n" +
            "  : 'medium';\n" +
            "const estimatedAmount = Number(parsed.estimated_amount || parsed.estimatedAmount || item.amount || 0) || 0;\n" +
            "return [{\n" +
            "  json: {\n" +
            "    ...item,\n" +
            "    account_name: parsed.account_name || item.account_name || item.accountName || 'Unknown Account',\n" +
            "    owner_name: parsed.owner_name || item.owner || item.accountOwner || '',\n" +
            "    confidence,\n" +
            "    estimated_amount: estimatedAmount,\n" +
            "    signal_summary: parsed.signal_summary || 'No signal summary returned.',\n" +
            "    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],\n" +
            "    recommended_action: parsed.recommended_action || 'Review the opportunity manually.',\n" +
            "    should_alert: parsed.should_alert !== false,\n" +
            "    analysis_json: parsed\n" +
            "  }\n" +
            "}];",
        },
        id: 'od-parse',
        name: 'Parse Opportunity Analysis',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [500, 120],
      },
      {
        parameters: {
          jsCode:
            "const items = $input.all().map((entry) => entry.json);\n" +
            "const alertItems = items.filter((item) => item.should_alert);\n" +
            "const config = items[0] || {};\n" +
            "const rank = { high: 0, medium: 1, low: 2 };\n" +
            "alertItems.sort((left, right) => (rank[left.confidence] ?? 3) - (rank[right.confidence] ?? 3) || (right.estimated_amount || 0) - (left.estimated_amount || 0));\n" +
            "const buckets = { high: [], medium: [], low: [] };\n" +
            "for (const item of alertItems) {\n" +
            "  const bucket = buckets[item.confidence] || buckets.medium;\n" +
            "  bucket.push(item);\n" +
            "}\n" +
            "const formatCurrency = (value) => {\n" +
            "  const numeric = Number(value || 0);\n" +
            "  return numeric > 0 ? `$${numeric.toLocaleString()}` : 'Amount TBD';\n" +
            "};\n" +
            "const sectionOrder = [\n" +
            "  ['high', '🟢 High Confidence'],\n" +
            "  ['medium', '🟡 Medium Confidence'],\n" +
            "  ['low', '⚪ Watch List']\n" +
            "];\n" +
            "const sections = [];\n" +
            "for (const [key, label] of sectionOrder) {\n" +
            "  const entries = buckets[key];\n" +
            "  if (!entries.length) continue;\n" +
            "  const lines = entries.flatMap((item) => {\n" +
            "    const evidence = item.evidence.slice(0, 2).map((line) => `- ${line}`);\n" +
            "    return [\n" +
            "      `• *${item.account_name}* | ${formatCurrency(item.estimated_amount)} | ${item.owner_name || 'Owner TBD'}`,\n" +
            "      `  ${item.signal_summary}`,\n" +
            "      ...evidence.map((line) => `  ${line}`),\n" +
            "      `  👉 ${item.recommended_action}`,\n" +
            "    ];\n" +
            "  });\n" +
            "  sections.push([`*${label}*`, ...lines].join('\\n'));\n" +
            "}\n" +
            "const reportDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });\n" +
            "const headline = alertItems.length\n" +
            "  ? `🔍 *Weekly Opportunity Discovery* — ${alertItems.length} hidden opportunities found`\n" +
            "  : '🔍 *Weekly Opportunity Discovery* — no qualifying hidden opportunities this week';\n" +
            "const slackBody = [headline, reportDate, '', ...(sections.length ? sections : ['No accounts cleared the confidence threshold this run.']), '', '_Powered by Backstory MCP — deterministic delivery_'].join('\\n');\n" +
            "const htmlSections = sections.length\n" +
            "  ? sections.map((section) => `<pre>${section.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]))}</pre>`).join('')\n" +
            "  : '<p>No accounts cleared the confidence threshold this run.</p>';\n" +
            "const htmlEmail = `<h2>Weekly Opportunity Discovery</h2><p>${reportDate}</p>${htmlSections}<p><em>Powered by Backstory MCP — deterministic delivery</em></p>`;\n" +
            "return [{ json: {\n" +
            "  workflow_id: '04-opportunity-discovery',\n" +
            "  workflow_name: 'Opportunity Discovery',\n" +
            "  delivery_channel_id: config.default_channel_id || '',\n" +
            "  summary_email: config.summary_email || '',\n" +
            "  from_email: config.from_email || 'success@backstory.ai',\n" +
            "  slack_body: slackBody,\n" +
            "  email_subject: `Weekly Opportunity Discovery — ${alertItems.length} account${alertItems.length === 1 ? '' : 's'} to review`,\n" +
            "  html_email: htmlEmail,\n" +
            "  plain_text: slackBody,\n" +
            "  opportunity_count: alertItems.length\n" +
            "} }];",
        },
        id: 'od-aggregate',
        name: 'Aggregate Weekly Digest',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [780, 120],
      },
      {
        parameters: {
          authentication: 'oAuth2',
          select: 'channel',
          channelId: {
            __rl: true,
            mode: 'id',
            value: '={{ $json.delivery_channel_id }}',
          },
          text: '={{ $json.slack_body }}',
          otherOptions: {
            unfurl_links: false,
          },
        },
        id: 'od-post-slack',
        name: 'Post Weekly Digest',
        type: 'n8n-nodes-base.slack',
        typeVersion: 2.3,
        position: [1060, 40],
      },
      {
        parameters: {
          fromEmail: '={{ $json.from_email }}',
          toEmail: '={{ $json.summary_email }}',
          subject: '={{ $json.email_subject }}',
          html: '={{ $json.html_email }}',
          options: {
            appendAttribution: false,
          },
        },
        id: 'od-send-email',
        name: 'Send Weekly Digest Email',
        type: 'n8n-nodes-base.emailSend',
        typeVersion: 2.1,
        position: [1060, 200],
      },
    ],
    connections: {
      'Schedule Trigger': {
        main: [[{ node: 'Workflow Configuration', type: 'main', index: 0 }]],
      },
      'Workflow Configuration': {
        main: [[{ node: 'Candidate Source Contract', type: 'main', index: 0 }]],
      },
      'Candidate Source Contract': {
        main: [[{ node: 'Load Candidate Inputs', type: 'main', index: 0 }]],
      },
      'Load Candidate Inputs': {
        main: [[{ node: 'Build Discovery Prompt', type: 'main', index: 0 }]],
      },
      'Build Discovery Prompt': {
        main: [[{ node: 'Generate Opportunity Analysis', type: 'main', index: 0 }]],
      },
      'Anthropic Chat Model': {
        ai_languageModel: [[{ node: 'Generate Opportunity Analysis', type: 'ai_languageModel', index: 0 }]],
      },
      'Backstory MCP': {
        ai_tool: [[{ node: 'Generate Opportunity Analysis', type: 'ai_tool', index: 0 }]],
      },
      'Generate Opportunity Analysis': {
        main: [[{ node: 'Parse Opportunity Analysis', type: 'main', index: 0 }]],
      },
      'Parse Opportunity Analysis': {
        main: [[{ node: 'Aggregate Weekly Digest', type: 'main', index: 0 }]],
      },
      'Aggregate Weekly Digest': {
        main: [
          [{ node: 'Post Weekly Digest', type: 'main', index: 0 }],
          [{ node: 'Send Weekly Digest Email', type: 'main', index: 0 }],
        ],
      },
    },
  });
}

function buildForecastCoachWorkflow({ starter = false }) {
  const mode = starter ? 'starter' : 'production';
  const sourcePath = starter ? '/forecast-coach/starter-leader-pipeline' : '/forecast-coach/leader-pipeline';

  return makeBaseWorkflow({
    id: starter ? '05-forecast-coach-starter' : '05-forecast-coach-production',
    name: starter ? 'Forecast Coach — Demo Starter' : 'Forecast Coach — Production Template',
    description:
      'Refactored Forecast Coach workflow that pulls leader-ready pipeline context from a shared source adapter, uses one bounded synthesis step for coaching guidance, and sends deterministic email reports without inline roster or CSV parsing code.',
    tags: ['pipeline-forecasting', 'n8n', starter ? 'starter' : 'production', 'reference'],
    nodes: [
      {
        parameters: {
          rule: {
            interval: [
              {
                field: 'cronExpression',
                expression: '0 7 * * 1',
              },
            ],
          },
        },
        id: 'fc-schedule-trigger',
        name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1.2,
        position: [-1100, 80],
      },
      {
        parameters: {
          assignments: {
            assignments: [
              { id: 'fc-ctx-1', name: 'workflow_id', type: 'string', value: '05-forecast-coach' },
              { id: 'fc-ctx-2', name: 'workflow_name', type: 'string', value: 'Forecast Coach' },
              { id: 'fc-ctx-3', name: 'mode', type: 'string', value: mode },
              { id: 'fc-ctx-4', name: 'trigger_type', type: 'string', value: 'schedule' },
              { id: 'fc-ctx-5', name: 'lookback_days', type: 'number', value: 90 },
              { id: 'fc-ctx-6', name: 'delivery_mode', type: 'string', value: 'email' },
              {
                id: 'fc-ctx-7',
                name: 'dry_run',
                type: 'boolean',
                value: starter ? true : '={{ $env.FC_DRY_RUN === "true" }}',
              },
              {
                id: 'fc-ctx-8',
                name: 'source_api_base_url',
                type: 'string',
                value: starter
                  ? '={{ $env.FC_STARTER_SOURCE_API_BASE_URL || "https://demo.backstory.local" }}'
                  : '={{ $env.FC_SOURCE_API_BASE_URL || "" }}',
              },
              {
                id: 'fc-ctx-9',
                name: 'from_email',
                type: 'string',
                value: '={{ $env.FC_FROM_EMAIL || $env.BACKSTORY_NO_REPLY_EMAIL || "success@backstory.ai" }}',
              },
              {
                id: 'fc-ctx-10',
                name: 'report_limit',
                type: 'number',
                value: starter ? 3 : '={{ Number($env.FC_REPORT_LIMIT || 8) }}',
              },
              {
                id: 'fc-ctx-11',
                name: 'quarter_scope',
                type: 'string',
                value: 'current_quarter',
              },
            ],
          },
          options: {},
        },
        id: 'fc-config',
        name: 'Workflow Configuration',
        type: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        position: [-840, 80],
      },
      {
        parameters: {
          assignments: {
            assignments: [
              { id: 'fc-src-1', name: 'run_context', type: 'json', value: '={{ $json }}' },
              { id: 'fc-src-2', name: 'source_system', type: 'string', value: 'forecast_coach_source' },
              { id: 'fc-src-3', name: 'source_path', type: 'string', value: sourcePath },
              { id: 'fc-src-4', name: 'source_method', type: 'string', value: 'POST' },
              {
                id: 'fc-src-5',
                name: 'source_body',
                type: 'json',
                value:
                  '={{ { lookback_days: $json.lookback_days, quarter_scope: $json.quarter_scope, report_limit: $json.report_limit, mode: $json.mode, dry_run: $json.dry_run } }}',
              },
              { id: 'fc-src-6', name: 'from_email', type: 'string', value: '={{ $json.from_email }}' },
            ],
          },
          options: {},
        },
        id: 'fc-source-contract',
        name: 'Leader Source Contract',
        type: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        position: [-560, 80],
      },
      {
        parameters: {
          workflowId: {
            __rl: true,
            mode: 'id',
            value: SHARED_SOURCE_ADAPTER_ID,
          },
          options: {},
        },
        id: 'fc-source-adapter',
        name: 'Load Leader Inputs',
        type: 'n8n-nodes-base.executeWorkflow',
        typeVersion: 1.2,
        position: [-280, 80],
      },
      {
        parameters: {
          assignments: {
            assignments: [
              {
                id: 'fc-prompt-1',
                name: 'agent_prompt',
                type: 'string',
                value:
                  '=Return strict JSON only with keys leader_name, leader_email, subject, plain_text, html_body, should_send, summary_detail, and focus_deals.\\n\\n' +
                  'You are producing a weekly forecast coaching report for one leader. Use MCP only for enrichment and factual analysis.\\n\\n' +
                  'Run context:\\n{{ JSON.stringify($json.run_context || {}, null, 2) }}\\n\\n' +
                  'Source record:\\n{{ JSON.stringify($json.raw_record || $json, null, 2) }}\\n\\n' +
                  'Rules:\\n' +
                  '- should_send must be false only when there is no meaningful coaching content.\\n' +
                  '- plain_text must be markdown-style and scannable in email.\\n' +
                  '- html_body must be lightweight, deterministic HTML with short sections.\\n' +
                  '- focus_deals must be an array of deal names or deal/account labels.',
              },
            ],
          },
          options: {},
        },
        id: 'fc-build-prompt',
        name: 'Build Coaching Prompt',
        type: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        position: [0, 80],
      },
      {
        parameters: {
          promptType: 'define',
          text: '={{ $json.agent_prompt }}',
          options: {
            systemMessage:
              'You are a forecast-coaching analyst. Use Backstory MCP only for enrichment. Output JSON only and keep delivery deterministic.',
          },
        },
        id: 'fc-agent',
        name: 'Generate Coaching Report',
        type: '@n8n/n8n-nodes-langchain.agent',
        typeVersion: 2,
        position: [280, 80],
      },
      {
        parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'claude-sonnet-4-5-20250929',
            cachedResultName: 'Claude Sonnet 4.5',
          },
          options: {},
        },
        id: 'fc-model',
        name: 'Anthropic Chat Model',
        type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
        typeVersion: 1.3,
        position: [280, 280],
      },
      {
        parameters: {
          endpointUrl: 'https://mcp.people.ai/mcp',
          authentication: 'multipleHeadersAuth',
          options: {},
        },
        id: 'fc-mcp',
        name: 'Backstory MCP',
        type: '@n8n/n8n-nodes-langchain.mcpClientTool',
        typeVersion: 1,
        position: [560, 280],
      },
      {
        parameters: {
          jsCode:
            "const item = $input.first().json;\n" +
            "const raw = item.output || item.text || item.response || item.message || '{}';\n" +
            "const cleaned = String(raw).trim().replace(/^```json\\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();\n" +
            "let parsed;\n" +
            "try {\n" +
            "  parsed = JSON.parse(cleaned);\n" +
            "} catch (error) {\n" +
            "  parsed = {\n" +
            "    leader_name: item.leader_name || item.owner || 'Sales Leader',\n" +
            "    leader_email: item.leader_email || item.owner_email || '',\n" +
            "    subject: `Forecast Coach — ${item.leader_name || 'Sales Leader'}`,\n" +
            "    plain_text: cleaned || 'No structured coaching summary returned.',\n" +
            "    html_body: `<p>${(cleaned || 'No structured coaching summary returned.').replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]))}</p>`,\n" +
            "    should_send: Boolean(item.leader_email || item.owner_email),\n" +
            "    summary_detail: 'Fallback coaching summary used.',\n" +
            "    focus_deals: []\n" +
            "  };\n" +
            "}\n" +
            "if (parsed.should_send === false) {\n" +
            "  return [];\n" +
            "}\n" +
            "const leaderEmail = parsed.leader_email || item.leader_email || item.owner_email || '';\n" +
            "if (!leaderEmail) {\n" +
            "  return [];\n" +
            "}\n" +
            "return [{ json: {\n" +
            "  ...item,\n" +
            "  leader_name: parsed.leader_name || item.leader_name || item.owner || 'Sales Leader',\n" +
            "  leader_email: leaderEmail,\n" +
            "  subject: parsed.subject || `Forecast Coach — ${parsed.leader_name || item.leader_name || 'Sales Leader'}`,\n" +
            "  plain_text: parsed.plain_text || 'No structured coaching summary returned.',\n" +
            "  html_body: parsed.html_body || `<p>${(parsed.plain_text || 'No structured coaching summary returned.').replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]))}</p>`,\n" +
            "  from_email: item.from_email || 'success@backstory.ai',\n" +
            "  summary_detail: parsed.summary_detail || '',\n" +
            "  focus_deals: Array.isArray(parsed.focus_deals) ? parsed.focus_deals : []\n" +
            "} }];",
        },
        id: 'fc-parse',
        name: 'Parse Coaching Report',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [560, 80],
      },
      {
        parameters: {
          fromEmail: '={{ $json.from_email }}',
          toEmail: '={{ $json.leader_email }}',
          subject: '={{ $json.subject }}',
          html: '={{ $json.html_body }}',
          options: {
            appendAttribution: false,
          },
        },
        id: 'fc-send-email',
        name: 'Send Coaching Email',
        type: 'n8n-nodes-base.emailSend',
        typeVersion: 2.1,
        position: [840, 80],
      },
    ],
    connections: {
      'Schedule Trigger': {
        main: [[{ node: 'Workflow Configuration', type: 'main', index: 0 }]],
      },
      'Workflow Configuration': {
        main: [[{ node: 'Leader Source Contract', type: 'main', index: 0 }]],
      },
      'Leader Source Contract': {
        main: [[{ node: 'Load Leader Inputs', type: 'main', index: 0 }]],
      },
      'Load Leader Inputs': {
        main: [[{ node: 'Build Coaching Prompt', type: 'main', index: 0 }]],
      },
      'Build Coaching Prompt': {
        main: [[{ node: 'Generate Coaching Report', type: 'main', index: 0 }]],
      },
      'Anthropic Chat Model': {
        ai_languageModel: [[{ node: 'Generate Coaching Report', type: 'ai_languageModel', index: 0 }]],
      },
      'Backstory MCP': {
        ai_tool: [[{ node: 'Generate Coaching Report', type: 'ai_tool', index: 0 }]],
      },
      'Generate Coaching Report': {
        main: [[{ node: 'Parse Coaching Report', type: 'main', index: 0 }]],
      },
      'Parse Coaching Report': {
        main: [[{ node: 'Send Coaching Email', type: 'main', index: 0 }]],
      },
    },
  });
}

function buildChannelPulseWorkflow({ starter = false }) {
  const mode = starter ? 'starter' : 'production';
  const sourcePath = starter ? '/channel-pulse/starter-accounts' : '/channel-pulse/accounts';

  return makeBaseWorkflow({
    id: starter ? '18-channel-pulse-starter' : '18-channel-pulse-production',
    name: starter ? 'Channel Pulse — Demo Starter' : 'Channel Pulse — Production Template',
    description:
      'Refactored Channel Pulse workflow that normalizes schedule and webhook triggers into one run_context contract, pulls candidate account updates through a shared source adapter, uses bounded MCP-backed synthesis, and posts native Slack updates through shared routing and delivery sub-workflows.',
    tags: ['account-monitoring', 'n8n', starter ? 'starter' : 'production', 'reference'],
    nodes: [
      {
        parameters: {
          rule: {
            interval: [
              {
                field: 'cronExpression',
                expression: '0 * * * *',
              },
            ],
          },
        },
        id: 'cp-schedule-trigger',
        name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1.2,
        position: [-1420, -120],
      },
      {
        parameters: {
          httpMethod: 'POST',
          path: 'channel-pulse',
          responseMode: 'responseNode',
          options: {},
        },
        id: 'cp-webhook-trigger',
        name: 'Webhook Trigger',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [-1420, 120],
      },
      {
        parameters: {
          respondWith: 'text',
          responseBody: 'Channel Pulse is preparing the account update now.',
          options: {},
        },
        id: 'cp-respond',
        name: 'Respond to Webhook',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1.4,
        position: [-1180, 120],
      },
      {
        parameters: {
          assignments: {
            assignments: [
              { id: 'cp-ctx-1', name: 'workflow_id', type: 'string', value: '18-channel-pulse' },
              { id: 'cp-ctx-2', name: 'workflow_name', type: 'string', value: 'Channel Pulse' },
              { id: 'cp-ctx-3', name: 'mode', type: 'string', value: mode },
              { id: 'cp-ctx-4', name: 'trigger_type', type: 'string', value: 'schedule' },
              { id: 'cp-ctx-5', name: 'lookback_days', type: 'number', value: 7 },
              { id: 'cp-ctx-6', name: 'delivery_mode', type: 'string', value: 'slack' },
              {
                id: 'cp-ctx-7',
                name: 'dry_run',
                type: 'boolean',
                value: starter ? true : '={{ $env.CP_DRY_RUN === "true" }}',
              },
              {
                id: 'cp-ctx-8',
                name: 'source_api_base_url',
                type: 'string',
                value: starter
                  ? '={{ $env.CP_STARTER_SOURCE_API_BASE_URL || "https://demo.backstory.local" }}'
                  : '={{ $env.CP_SOURCE_API_BASE_URL || "" }}',
              },
              {
                id: 'cp-ctx-9',
                name: 'default_channel_id',
                type: 'string',
                value: starter
                  ? '={{ $env.CP_STARTER_CHANNEL_ID || "YOUR_SLACK_CHANNEL_ID" }}'
                  : '={{ $env.CP_DEFAULT_CHANNEL_ID || "" }}',
              },
              {
                id: 'cp-ctx-10',
                name: 'min_acv',
                type: 'number',
                value: starter ? 25000 : '={{ Number($env.CP_MIN_ACV || 50000) }}',
              },
              { id: 'cp-ctx-11', name: 'requested_account_name', type: 'string', value: '' },
            ],
          },
          options: {},
        },
        id: 'cp-normalize-scheduled',
        name: 'Normalize Scheduled Trigger',
        type: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        position: [-1140, -120],
      },
      {
        parameters: {
          jsCode:
            "const body = $json.body || {};\n" +
            "return [{ json: {\n" +
            "  workflow_id: '18-channel-pulse',\n" +
            "  workflow_name: 'Channel Pulse',\n" +
            `  mode: '${mode}',\n` +
            "  trigger_type: 'webhook',\n" +
            "  lookback_days: 7,\n" +
            "  delivery_mode: 'slack',\n" +
            `  dry_run: ${starter ? 'true' : "$env.CP_DRY_RUN === 'true'"},\n` +
            `  source_api_base_url: ${starter ? "($env.CP_STARTER_SOURCE_API_BASE_URL || 'https://demo.backstory.local')" : "($env.CP_SOURCE_API_BASE_URL || '')"},\n` +
            `  default_channel_id: body.channel_id || ${starter ? "($env.CP_STARTER_CHANNEL_ID || 'YOUR_SLACK_CHANNEL_ID')" : "($env.CP_DEFAULT_CHANNEL_ID || '')"},\n` +
            `  min_acv: ${starter ? "Number($env.CP_MIN_ACV || 25000)" : "Number($env.CP_MIN_ACV || 50000)"},\n` +
            "  requested_account_name: body.text || body.account_name || ''\n" +
            "} }];",
        },
        id: 'cp-normalize-webhook',
        name: 'Normalize Webhook Trigger',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [-1140, 280],
      },
      {
        parameters: {
          assignments: {
            assignments: [
              { id: 'cp-src-1', name: 'run_context', type: 'json', value: '={{ $json }}' },
              { id: 'cp-src-2', name: 'source_system', type: 'string', value: 'channel_pulse_source' },
              { id: 'cp-src-3', name: 'source_path', type: 'string', value: sourcePath },
              { id: 'cp-src-4', name: 'source_method', type: 'string', value: 'POST' },
              {
                id: 'cp-src-5',
                name: 'source_body',
                type: 'json',
                value:
                  '={{ { lookback_days: $json.lookback_days, min_acv: $json.min_acv, requested_account_name: $json.requested_account_name || "", mode: $json.mode, dry_run: $json.dry_run } }}',
              },
              { id: 'cp-src-6', name: 'default_channel_id', type: 'string', value: '={{ $json.default_channel_id }}' },
            ],
          },
          options: {},
        },
        id: 'cp-source-contract',
        name: 'Account Source Contract',
        type: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        position: [-840, 80],
      },
      {
        parameters: {
          workflowId: {
            __rl: true,
            mode: 'id',
            value: SHARED_SOURCE_ADAPTER_ID,
          },
          options: {},
        },
        id: 'cp-source-adapter',
        name: 'Load Account Inputs',
        type: 'n8n-nodes-base.executeWorkflow',
        typeVersion: 1.2,
        position: [-560, 80],
      },
      {
        parameters: {
          assignments: {
            assignments: [
              {
                id: 'cp-prompt-1',
                name: 'agent_prompt',
                type: 'string',
                value:
                  '=Return strict JSON only with keys title, body, should_post, target_type, target_id, thread_key, and account_name.\\n\\n' +
                  'You are producing a scannable internal account-channel update. Use MCP only for enrichment and summary synthesis.\\n\\n' +
                  'Run context:\\n{{ JSON.stringify($json.run_context || {}, null, 2) }}\\n\\n' +
                  'Source record:\\n{{ JSON.stringify($json.raw_record || $json, null, 2) }}\\n\\n' +
                  'Rules:\\n' +
                  '- should_post=false when the account has no material activity worth posting.\\n' +
                  '- body must be markdown-ready and concise for Slack.\\n' +
                  '- target_type should be channel unless the source explicitly requires a DM.\\n' +
                  '- target_id may be blank if routing should fall back to route_channel_id or default_channel_id.',
              },
            ],
          },
          options: {},
        },
        id: 'cp-build-prompt',
        name: 'Build Customer Update Prompt',
        type: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        position: [-280, 80],
      },
      {
        parameters: {
          promptType: 'define',
          text: '={{ $json.agent_prompt }}',
          options: {
            systemMessage:
              'You are a Slack update generator for internal customer channels. Use Backstory MCP only for enrichment. Output JSON only.',
          },
        },
        id: 'cp-agent',
        name: 'Generate Customer Update',
        type: '@n8n/n8n-nodes-langchain.agent',
        typeVersion: 2,
        position: [0, 80],
      },
      {
        parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'claude-sonnet-4-5-20250929',
            cachedResultName: 'Claude Sonnet 4.5',
          },
          options: {},
        },
        id: 'cp-model',
        name: 'Anthropic Chat Model',
        type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
        typeVersion: 1.3,
        position: [0, 280],
      },
      {
        parameters: {
          endpointUrl: 'https://mcp.people.ai/mcp',
          authentication: 'multipleHeadersAuth',
          options: {},
        },
        id: 'cp-mcp',
        name: 'Backstory MCP',
        type: '@n8n/n8n-nodes-langchain.mcpClientTool',
        typeVersion: 1,
        position: [280, 280],
      },
      {
        parameters: {
          jsCode:
            "const item = $input.first().json;\n" +
            "const raw = item.output || item.text || item.response || item.message || '{}';\n" +
            "const cleaned = String(raw).trim().replace(/^```json\\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();\n" +
            "let parsed;\n" +
            "try {\n" +
            "  parsed = JSON.parse(cleaned);\n" +
            "} catch (error) {\n" +
            "  parsed = {\n" +
            "    title: item.account_name || item.accountName || 'Channel Pulse',\n" +
            "    body: cleaned || 'No structured update returned.',\n" +
            "    should_post: true,\n" +
            "    target_type: 'channel',\n" +
            "    target_id: item.route_channel_id || item.default_channel_id || '',\n" +
            "    thread_key: '',\n" +
            "    account_name: item.account_name || item.accountName || 'Channel Pulse'\n" +
            "  };\n" +
            "}\n" +
            "if (parsed.should_post === false) {\n" +
            "  return [];\n" +
            "}\n" +
            "const title = parsed.title || item.account_name || item.accountName || 'Channel Pulse';\n" +
            "const body = parsed.body || 'No structured update returned.';\n" +
            "return [{ json: {\n" +
            "  ...item,\n" +
            "  account_name: parsed.account_name || item.account_name || item.accountName || title,\n" +
            "  title,\n" +
            "  body: body.startsWith('*') ? body : `*${title}*\\n\\n${body}`,\n" +
            "  target_type: parsed.target_type || 'channel',\n" +
            "  target_id: parsed.target_id || item.route_channel_id || item.default_channel_id || '',\n" +
            "  thread_key: parsed.thread_key || '',\n" +
            "  route_channel_id: item.route_channel_id || parsed.target_id || item.default_channel_id || ''\n" +
            "} }];",
        },
        id: 'cp-parse',
        name: 'Parse Customer Update JSON',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [280, 80],
      },
      {
        parameters: {
          workflowId: {
            __rl: true,
            mode: 'id',
            value: SHARED_IDENTITY_ROUTING_ID,
          },
          options: {},
        },
        id: 'cp-route',
        name: 'Resolve Delivery Target',
        type: 'n8n-nodes-base.executeWorkflow',
        typeVersion: 1.2,
        position: [560, 80],
      },
      {
        parameters: {
          workflowId: {
            __rl: true,
            mode: 'id',
            value: SHARED_DELIVERY_RENDERER_ID,
          },
          options: {},
        },
        id: 'cp-render',
        name: 'Render Delivery Payload',
        type: 'n8n-nodes-base.executeWorkflow',
        typeVersion: 1.2,
        position: [840, 80],
      },
      {
        parameters: {
          authentication: 'oAuth2',
          select: 'channel',
          channelId: {
            __rl: true,
            mode: 'id',
            value: '={{ $json.delivery_payload.target_id }}',
          },
          text: '={{ $json.delivery_payload.body }}',
          otherOptions: {
            unfurl_links: false,
          },
        },
        id: 'cp-post-slack',
        name: 'Post Channel Update',
        type: 'n8n-nodes-base.slack',
        typeVersion: 2.3,
        position: [1120, 80],
      },
    ],
    connections: {
      'Schedule Trigger': {
        main: [[{ node: 'Normalize Scheduled Trigger', type: 'main', index: 0 }]],
      },
      'Webhook Trigger': {
        main: [
          [{ node: 'Respond to Webhook', type: 'main', index: 0 }],
          [{ node: 'Normalize Webhook Trigger', type: 'main', index: 0 }],
        ],
      },
      'Normalize Scheduled Trigger': {
        main: [[{ node: 'Account Source Contract', type: 'main', index: 0 }]],
      },
      'Normalize Webhook Trigger': {
        main: [[{ node: 'Account Source Contract', type: 'main', index: 0 }]],
      },
      'Account Source Contract': {
        main: [[{ node: 'Load Account Inputs', type: 'main', index: 0 }]],
      },
      'Load Account Inputs': {
        main: [[{ node: 'Build Customer Update Prompt', type: 'main', index: 0 }]],
      },
      'Build Customer Update Prompt': {
        main: [[{ node: 'Generate Customer Update', type: 'main', index: 0 }]],
      },
      'Anthropic Chat Model': {
        ai_languageModel: [[{ node: 'Generate Customer Update', type: 'ai_languageModel', index: 0 }]],
      },
      'Backstory MCP': {
        ai_tool: [[{ node: 'Generate Customer Update', type: 'ai_tool', index: 0 }]],
      },
      'Generate Customer Update': {
        main: [[{ node: 'Parse Customer Update JSON', type: 'main', index: 0 }]],
      },
      'Parse Customer Update JSON': {
        main: [[{ node: 'Resolve Delivery Target', type: 'main', index: 0 }]],
      },
      'Resolve Delivery Target': {
        main: [[{ node: 'Render Delivery Payload', type: 'main', index: 0 }]],
      },
      'Render Delivery Payload': {
        main: [[{ node: 'Post Channel Update', type: 'main', index: 0 }]],
      },
    },
  });
}

function buildDocs() {
  return {
    opportunitySource: `
# 04 — Opportunity Discovery

## Overview

This production template replaces the legacy CSV-heavy export logic with a shared source-adapter contract that returns candidate accounts already normalized for opportunity discovery.

## Attached Platform Assets

- \`full.json\`: production n8n template
- \`starter.json\`: demo-safe starter asset
- \`workato-guide.md\`: plain-English Workato implementation guide
- \`zapier-guide.md\`: plain-English Zapier implementation guide

## Contracts

- \`run_context\`: workflow, trigger, lookback, mode, dry-run, and delivery defaults
- \`source_record\`: one candidate account with owner, account context, and source metadata
- \`enrichment_context\`: MCP-backed signal analysis used only during synthesis
- \`delivery_payload\`: deterministic digest payload for Slack and email delivery

## Configuration

- \`OD_SOURCE_API_BASE_URL\`
- \`OD_DEFAULT_CHANNEL_ID\`
- \`OD_SUMMARY_EMAIL\`
- \`OD_ENGAGEMENT_THRESHOLD\`
- \`OD_MAX_ACCOUNTS\`
- Shared source-adapter workflow ID

## Design Rules

1. The shared source adapter owns engagement and pipeline-gap normalization.
2. The agent returns JSON only; MCP is used only for enrichment and synthesis.
3. Slack and email delivery stay native and deterministic.
4. The workflow produces one digest for the shared review channel and summary email list.

## Required Shared Sub-workflows

- Shared — Source Adapter
`,
    opportunityRecipe: `
# Opportunity Discovery — Platform-Agnostic Recipe

## Reference Architecture

\`trigger -> normalize -> source adapter -> enrich -> score -> aggregate -> deliver\`

## Production Implementation Notes

- Use a source adapter to return one normalized \`source_record\` per candidate account with no active open opportunity.
- Keep the enrichment step bounded to MCP or equivalent account-intelligence tools.
- Require structured JSON from the model before any aggregation or delivery.
- Use native Slack and email connectors for the final digest.

## Shared Components To Recreate Outside n8n

- Source adapter
- Candidate-account scoring prompt
- Weekly digest formatter

## Agent Boundary

Keep agentic behavior limited to buying-signal scoring and recommendation generation. Delivery, aggregation, and routing should stay deterministic.
`,
    forecastSource: `
# 05 — Forecast Coach

## Overview

This production template replaces inline roster parsing and CSV grouping with a shared source-adapter contract that emits one normalized leader pipeline packet per delivery target.

## Attached Platform Assets

- \`full.json\`: production n8n template
- \`starter.json\`: demo-safe starter asset
- \`workato-guide.md\`: plain-English Workato implementation guide
- \`zapier-guide.md\`: plain-English Zapier implementation guide

## Contracts

- \`run_context\`: workflow, trigger, quarter scope, mode, and dry-run defaults
- \`source_record\`: one leader-ready pipeline packet with rep coverage, deals, and owner metadata
- \`enrichment_context\`: MCP-backed coaching context used only during synthesis
- \`delivery_payload\`: deterministic email-ready report fields

## Configuration

- \`FC_SOURCE_API_BASE_URL\`
- \`FC_FROM_EMAIL\`
- \`FC_REPORT_LIMIT\`
- Shared source-adapter workflow ID

## Design Rules

1. The shared source adapter owns leader roster expansion and opportunity normalization.
2. The agent returns JSON only for coaching output.
3. Email delivery stays native and deterministic.
4. One report is generated per leader item, not by batching custom code in the main workflow.

## Required Shared Sub-workflows

- Shared — Source Adapter
`,
    forecastRecipe: `
# Forecast Coach — Platform-Agnostic Recipe

## Reference Architecture

\`trigger -> normalize -> source adapter -> enrich -> coach -> deliver\`

## Production Implementation Notes

- Use a source adapter to emit one leader-scoped \`source_record\` containing the open pipeline, coverage details, and stage risk metadata.
- Keep deal-health synthesis bounded to one structured AI output step.
- Send native email directly from the structured result instead of formatting with loop-heavy custom code.

## Shared Components To Recreate Outside n8n

- Source adapter
- Leader coaching prompt
- Email renderer

## Agent Boundary

Keep agentic behavior limited to coaching synthesis and risk framing. Team expansion, routing, and delivery should stay deterministic.
`,
    pulseSource: `
# 18 — Channel Pulse

## Overview

This production template replaces raw Slack lookup calls and bespoke routing code with normalized trigger contracts, a shared source adapter, shared delivery routing, and native Slack posting.

## Attached Platform Assets

- \`full.json\`: production n8n template
- \`starter.json\`: demo-safe starter asset
- \`workato-guide.md\`: plain-English Workato implementation guide
- \`zapier-guide.md\`: plain-English Zapier implementation guide

## Contracts

- \`run_context\`: trigger metadata, lookback, routing defaults, mode, and dry-run state
- \`source_record\`: one account update candidate with route metadata and account context
- \`enrichment_context\`: MCP-backed activity analysis used only for synthesis
- \`delivery_payload\`: deterministic Slack message payload

## Configuration

- \`CP_SOURCE_API_BASE_URL\`
- \`CP_DEFAULT_CHANNEL_ID\`
- \`CP_MIN_ACV\`
- Shared source-adapter, identity-resolution, and delivery-renderer workflow IDs

## Design Rules

1. Schedule and webhook triggers collapse into one \`run_context\`.
2. The shared source adapter owns account selection and route metadata.
3. The agent returns JSON only; MCP is used only during synthesis.
4. Shared routing and renderer sub-workflows own target resolution and Slack payload shaping.
5. Native Slack nodes handle all delivery side effects.

## Required Shared Sub-workflows

- Shared — Source Adapter
- Shared — Identity And Channel Resolution
- Shared — Delivery Renderer
`,
    pulseRecipe: `
# Channel Pulse — Platform-Agnostic Recipe

## Reference Architecture

\`trigger -> normalize -> source adapter -> enrich -> summarize -> route -> deliver\`

## Production Implementation Notes

- Use one source adapter to emit normalized account-update candidates with route-channel metadata.
- Keep the LLM output structured and bounded to content synthesis only.
- Use a deterministic routing layer and native Slack connector for delivery.
- Split manual and scheduled entry points only at the trigger layer; the rest of the workflow should be shared.

## Shared Components To Recreate Outside n8n

- Source adapter
- Identity/channel resolver
- Delivery renderer

## Agent Boundary

Keep agentic behavior limited to generating the update body. Routing, payload shaping, and transport should stay deterministic.
`,
  };
}

export function rebuildStandardN8nWorkflows(repoRoot = defaultRepoRoot) {
  const docs = buildDocs();
  const workflows = [
    {
      dir: '04-opportunity-discovery',
      full: buildOpportunityDiscoveryWorkflow({ starter: false }),
      starter: buildOpportunityDiscoveryWorkflow({ starter: true }),
      source: docs.opportunitySource,
      recipe: docs.opportunityRecipe,
    },
    {
      dir: '05-forecast-coach',
      full: buildForecastCoachWorkflow({ starter: false }),
      starter: buildForecastCoachWorkflow({ starter: true }),
      source: docs.forecastSource,
      recipe: docs.forecastRecipe,
    },
    {
      dir: '18-channel-pulse',
      full: buildChannelPulseWorkflow({ starter: false }),
      starter: buildChannelPulseWorkflow({ starter: true }),
      source: docs.pulseSource,
      recipe: docs.pulseRecipe,
    },
  ];

  for (const workflow of workflows) {
    const dir = path.join(repoRoot, workflow.dir);
    writeJson(path.join(dir, 'full.json'), workflow.full);
    writeJson(path.join(dir, 'starter.json'), workflow.starter);
    writeText(path.join(dir, 'SOURCE.md'), workflow.source);
    writeText(path.join(dir, 'recipe-card.md'), workflow.recipe);
  }

  return {
    workflowCount: workflows.length,
    updated: workflows.map((workflow) => workflow.dir),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(rebuildStandardN8nWorkflows(), null, 2));
}
