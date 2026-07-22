import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorkatoGuide, buildZapierGuide } from './workflow-platform-helpers.mjs';
import { rebuildStandardN8nWorkflows } from './rebuild-standard-n8n-workflows.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const sharedDir = path.join(repoRoot, 'shared-n8n');
const dcosDir = path.join(repoRoot, '29-digital-chief-of-staff');
const downloadSource = '/Users/james.mcdaniel/Downloads/DCOS___Digital_Chief_of_Staff__FINAL_FIXED.json';
const catalogPath = path.join(repoRoot, 'workflows.json');

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });
const writeJson = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
const writeText = (target, value) => fs.writeFileSync(target, value.trimStart());

const makeBaseWorkflow = ({ id, name, description, nodes, connections }) => ({
  name,
  description,
  active: false,
  settings: {},
  pinData: {},
  versionId: `${id}-v1`,
  meta: {
    templateCredsSetupCompleted: false,
  },
  id,
  nodes,
  connections,
});

const sharedWorkflows = {
  'source-adapter.json': makeBaseWorkflow({
    id: 'shared-source-adapter',
    name: 'Shared — Source Adapter',
    description:
      'Reusable source-system adapter that turns a generic API response into normalized source_record items.',
    nodes: [
      {
        parameters: {
          inputSource: 'passthrough',
        },
        id: 'shared-source-trigger',
        name: 'When Executed by Another Workflow',
        type: 'n8n-nodes-base.executeWorkflowTrigger',
        typeVersion: 1.1,
        position: [-560, 0],
      },
      {
        parameters: {
          method: '={{ $json.source_method || "GET" }}',
          url: '={{ (($json.source_api_base_url || $env.SOURCE_API_BASE_URL || "").replace(/\\/$/, "")) + ($json.source_path || "") }}',
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: 'Accept',
                value: 'application/json',
              },
              {
                name: 'Authorization',
                value: '={{ $json.source_bearer_token ? `Bearer ${$json.source_bearer_token}` : "" }}',
              },
            ],
          },
          sendBody: true,
          specifyBody: 'json',
          jsonBody: '={{ $json.source_body || {} }}',
          options: {},
        },
        id: 'shared-source-fetch',
        name: 'Fetch Source Payload',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [-260, 0],
        onError: 'continueRegularOutput',
      },
      {
        parameters: {
          jsCode:
            'const payload = $json.records || $json.items || $json.data || $json.results || [];\n' +
            'const records = Array.isArray(payload) ? payload : [payload];\n' +
            'return records.filter(Boolean).map((record, index) => ({\n' +
            '  json: {\n' +
            '    ...record,\n' +
            '    source_system: $input.first().json.source_system || "source-system",\n' +
            '    source_id: String(record.source_id || record.id || record.accountId || record.opportunityId || index + 1),\n' +
            '    source_url: record.source_url || record.url || record.link || "",\n' +
            '    owner: record.owner || record.accountOwner || record.opportunityOwner || "",\n' +
            '    account_name: record.account_name || record.accountName || record.account || record.company || "",\n' +
            '    opportunity_name: record.opportunity_name || record.opportunityName || record.dealName || "",\n' +
            '    workflow_specific_fields: record,\n' +
            '    raw_record: record,\n' +
            '    run_context: $input.first().json.run_context || {}\n' +
            '  }\n' +
            '}));',
        },
        id: 'shared-source-normalize',
        name: 'Normalize Source Records',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [40, 0],
      },
    ],
    connections: {
      'When Executed by Another Workflow': {
        main: [[{ node: 'Fetch Source Payload', type: 'main', index: 0 }]],
      },
      'Fetch Source Payload': {
        main: [[{ node: 'Normalize Source Records', type: 'main', index: 0 }]],
      },
    },
  }),
  'backstory-enrichment.json': makeBaseWorkflow({
    id: 'shared-backstory-enrichment',
    name: 'Shared — Backstory Enrichment',
    description: 'Reusable enrichment step that limits MCP usage to synthesis and returns structured enrichment_context.',
    nodes: [
      {
        parameters: {
          inputSource: 'passthrough',
        },
        id: 'shared-enrichment-trigger',
        name: 'When Executed by Another Workflow',
        type: 'n8n-nodes-base.executeWorkflowTrigger',
        typeVersion: 1.1,
        position: [-700, 0],
      },
      {
        parameters: {
          assignments: {
            assignments: [
              {
                id: 'enrichment-prompt',
                name: 'enrichment_prompt',
                type: 'string',
                value:
                  '=Return strict JSON with keys summary, confidence, source_refs, and tool_results.\\n\\n' +
                  'Use Backstory MCP to enrich this source record for the current workflow.\\n\\n' +
                  'Run context:\\n{{ JSON.stringify($json.run_context || {}, null, 2) }}\\n\\n' +
                  'Source record:\\n{{ JSON.stringify($json.raw_record || $json, null, 2) }}',
              },
            ],
          },
          options: {},
        },
        id: 'shared-enrichment-set',
        name: 'Build Enrichment Prompt',
        type: 'n8n-nodes-base.set',
        typeVersion: 3.4,
        position: [-420, 0],
      },
      {
        parameters: {
          promptType: 'define',
          text: '={{ $json.enrichment_prompt }}',
          options: {
            systemMessage:
              'You are a workflow enrichment agent. Use MCP only for enrichment. Do not route, deliver, or perform side effects. Output JSON only.',
          },
        },
        id: 'shared-enrichment-agent',
        name: 'Generate Enrichment Context',
        type: '@n8n/n8n-nodes-langchain.agent',
        typeVersion: 2,
        position: [-140, 0],
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
        id: 'shared-enrichment-model',
        name: 'Anthropic Chat Model',
        type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
        typeVersion: 1.3,
        position: [-140, 180],
      },
      {
        parameters: {
          endpointUrl: 'https://mcp.backstory.ai/mcp',
          authentication: 'multipleHeadersAuth',
          options: {},
        },
        id: 'shared-enrichment-mcp',
        name: 'Backstory MCP',
        type: '@n8n/n8n-nodes-langchain.mcpClientTool',
        typeVersion: 1,
        position: [120, 180],
      },
      {
        parameters: {
          jsCode:
            'const item = $input.first().json;\n' +
            'const raw = item.output || item.text || item.response || item.message || "{}";\n' +
            'let parsed;\n' +
            'try {\n' +
            '  parsed = JSON.parse(raw);\n' +
            '} catch (error) {\n' +
            '  parsed = { summary: raw, confidence: "low", source_refs: [], tool_results: [] };\n' +
            '}\n' +
            'return [{ json: { ...$json, enrichment_context: parsed } }];',
        },
        id: 'shared-enrichment-parse',
        name: 'Parse Enrichment Context',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [160, 0],
      },
    ],
    connections: {
      'When Executed by Another Workflow': {
        main: [[{ node: 'Build Enrichment Prompt', type: 'main', index: 0 }]],
      },
      'Build Enrichment Prompt': {
        main: [[{ node: 'Generate Enrichment Context', type: 'main', index: 0 }]],
      },
      'Anthropic Chat Model': {
        ai_languageModel: [[{ node: 'Generate Enrichment Context', type: 'ai_languageModel', index: 0 }]],
      },
      'Backstory MCP': {
        ai_tool: [[{ node: 'Generate Enrichment Context', type: 'ai_tool', index: 0 }]],
      },
      'Generate Enrichment Context': {
        main: [[{ node: 'Parse Enrichment Context', type: 'main', index: 0 }]],
      },
    },
  }),
  'identity-channel-resolution.json': makeBaseWorkflow({
    id: 'shared-identity-channel-resolution',
    name: 'Shared — Identity And Channel Resolution',
    description: 'Deterministic routing layer that resolves Slack user or channel targets without invoking agents.',
    nodes: [
      {
        parameters: {
          inputSource: 'passthrough',
        },
        id: 'shared-routing-trigger',
        name: 'When Executed by Another Workflow',
        type: 'n8n-nodes-base.executeWorkflowTrigger',
        typeVersion: 1.1,
        position: [-500, 0],
      },
      {
        parameters: {
          jsCode:
            'const item = $input.first().json;\n' +
            'const preferredType = item.target_type || item.delivery_target_type || "channel";\n' +
            'const preferredId = item.target_id || item.route_channel_id || item.owner_slack_user_id || item.default_channel_id || "";\n' +
            'return [{ json: { ...item, delivery_target: { target_type: preferredType, target_id: preferredId } } }];',
        },
        id: 'shared-routing-code',
        name: 'Resolve Delivery Target',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [-180, 0],
      },
    ],
    connections: {
      'When Executed by Another Workflow': {
        main: [[{ node: 'Resolve Delivery Target', type: 'main', index: 0 }]],
      },
    },
  }),
  'delivery-renderer.json': makeBaseWorkflow({
    id: 'shared-delivery-renderer',
    name: 'Shared — Delivery Renderer',
    description: 'Builds deterministic delivery_payload objects for Slack, Teams, email, and webhook adapters.',
    nodes: [
      {
        parameters: {
          inputSource: 'passthrough',
        },
        id: 'shared-delivery-trigger',
        name: 'When Executed by Another Workflow',
        type: 'n8n-nodes-base.executeWorkflowTrigger',
        typeVersion: 1.1,
        position: [-500, 0],
      },
      {
        parameters: {
          jsCode:
            'const item = $input.first().json;\n' +
            'const deliveryTarget = item.delivery_target || { target_type: item.target_type || "channel", target_id: item.target_id || item.default_channel_id || "" };\n' +
            'const title = item.title || item.delivery_title || item.account_name || item.workflow_name || "Workflow Update";\n' +
            'const body = item.body || item.delivery_body || item.summary || item.message || "";\n' +
            'return [{ json: { ...item, delivery_payload: {\n' +
            '  target_type: deliveryTarget.target_type,\n' +
            '  target_id: deliveryTarget.target_id,\n' +
            '  format: item.delivery_format || "markdown",\n' +
            '  title,\n' +
            '  body,\n' +
            '  blocks_or_html: body,\n' +
            '  thread_key: item.thread_key || "",\n' +
            '  dedupe_key: item.dedupe_key || `${item.workflow_id || "workflow"}:${deliveryTarget.target_type}:${deliveryTarget.target_id}`\n' +
            '} } }];',
        },
        id: 'shared-delivery-code',
        name: 'Build Delivery Payload',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [-180, 0],
      },
    ],
    connections: {
      'When Executed by Another Workflow': {
        main: [[{ node: 'Build Delivery Payload', type: 'main', index: 0 }]],
      },
    },
  }),
  'calendar-task-writer.json': makeBaseWorkflow({
    id: 'shared-calendar-task-writer',
    name: 'Shared — Calendar And Task Writer',
    description: 'Writes a normalized calendar task using the native Google Calendar node and returns an execution summary.',
    nodes: [
      {
        parameters: {
          inputSource: 'passthrough',
        },
        id: 'shared-calendar-trigger',
        name: 'When Executed by Another Workflow',
        type: 'n8n-nodes-base.executeWorkflowTrigger',
        typeVersion: 1.1,
        position: [-520, 0],
      },
      {
        parameters: {
          resource: 'event',
          operation: 'create',
          calendar: {
            __rl: true,
            mode: 'id',
            value: '={{ $json.calendar_id || $env.GOOGLE_CALENDAR_ID || "" }}',
          },
          start: '={{ $json.calendar_event?.start || $now }}',
          end: '={{ $json.calendar_event?.end || $now.plus(1, "hour") }}',
          useDefaultReminders: true,
          additionalFields: {
            summary: '={{ $json.calendar_event?.summary || $json.calendar_event?.title || "Workflow Task" }}',
            description: '={{ $json.calendar_event?.description || $json.briefing || "" }}',
          },
        },
        id: 'shared-calendar-node',
        name: 'Create Calendar Event',
        type: 'n8n-nodes-base.googleCalendar',
        typeVersion: 1.3,
        position: [-200, 0],
      },
      {
        parameters: {
          jsCode:
            'return [{ json: { ...$input.first().json, calendar_write_result: { ok: true, summary: $json.summary || $json.calendar_event?.summary || "Workflow Task" } } }];',
        },
        id: 'shared-calendar-summary',
        name: 'Summarize Calendar Write',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [120, 0],
      },
    ],
    connections: {
      'When Executed by Another Workflow': {
        main: [[{ node: 'Create Calendar Event', type: 'main', index: 0 }]],
      },
      'Create Calendar Event': {
        main: [[{ node: 'Summarize Calendar Write', type: 'main', index: 0 }]],
      },
    },
  }),
  'run-summary-observability.json': makeBaseWorkflow({
    id: 'shared-run-summary-observability',
    name: 'Shared — Run Summary And Observability',
    description: 'Builds a deterministic run summary message from the normalized run_context and execution state.',
    nodes: [
      {
        parameters: {
          inputSource: 'passthrough',
        },
        id: 'shared-summary-trigger',
        name: 'When Executed by Another Workflow',
        type: 'n8n-nodes-base.executeWorkflowTrigger',
        typeVersion: 1.1,
        position: [-500, 0],
      },
      {
        parameters: {
          jsCode:
            'const item = $input.first().json;\n' +
            'const context = item.run_context || {};\n' +
            'const lines = [\n' +
            '  `*${context.workflow_name || item.workflow_name || "Workflow"} — Run Summary*`,\n' +
            '  `Mode: ${context.mode || item.mode || "production"}`,\n' +
            '  `Trigger: ${context.trigger_type || item.trigger_type || "schedule"}`,\n' +
            '  `Dry run: ${context.dry_run || item.dry_run ? "yes" : "no"}`,\n' +
            '  item.summary_detail || "Completed shared workflow stages."\n' +
            '].filter(Boolean);\n' +
            'return [{ json: { ...item, summary_message: lines.join("\\n"), delivery_target: { target_type: "channel", target_id: item.summary_channel_id || item.default_channel_id || "" } } }];',
        },
        id: 'shared-summary-code',
        name: 'Build Run Summary',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [-180, 0],
      },
    ],
    connections: {
      'When Executed by Another Workflow': {
        main: [[{ node: 'Build Run Summary', type: 'main', index: 0 }]],
      },
    },
  }),
};

const dcosFull = makeBaseWorkflow({
  id: '29-digital-chief-of-staff-production',
  name: 'Digital Chief of Staff — Production Template',
  description:
    'Reference-quality Digital Chief of Staff workflow that uses shared sub-workflows for source access, routing, delivery rendering, calendar writing, and run summaries while reserving agent + MCP usage for enrichment and synthesis.',
  nodes: [
    {
      parameters: {
        rule: {
          interval: [
            {
              field: 'cronExpression',
              expression: '0 7 * * 1-5',
            },
          ],
        },
      },
      id: 'dcos-schedule-trigger',
      name: 'Schedule Trigger',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [-1560, -120],
    },
    {
      parameters: {
        httpMethod: 'POST',
        path: 'digital-chief-of-staff',
        responseMode: 'responseNode',
        options: {},
      },
      id: 'dcos-webhook-trigger',
      name: 'Slash Command Trigger',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [-1560, 120],
    },
    {
      parameters: {
        respondWith: 'text',
        responseBody: 'Digital Chief of Staff is compiling the briefing now.',
        options: {},
      },
      id: 'dcos-respond',
      name: 'Respond to Slack',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.4,
      position: [-1320, 120],
    },
    {
      parameters: {
        assignments: {
          assignments: [
            { id: 'ctx-1', name: 'workflow_id', type: 'string', value: '29-digital-chief-of-staff' },
            { id: 'ctx-2', name: 'workflow_name', type: 'string', value: 'Digital Chief of Staff' },
            { id: 'ctx-3', name: 'mode', type: 'string', value: 'production' },
            { id: 'ctx-4', name: 'trigger_type', type: 'string', value: 'schedule' },
            { id: 'ctx-5', name: 'lookback_days', type: 'number', value: 7 },
            { id: 'ctx-6', name: 'delivery_mode', type: 'string', value: 'slack_and_calendar' },
            { id: 'ctx-7', name: 'dry_run', type: 'boolean', value: '={{ $env.DCOS_DRY_RUN === "true" }}' },
            { id: 'ctx-8', name: 'source_system', type: 'string', value: 'crm_and_meeting_stack' },
            { id: 'ctx-9', name: 'source_api_base_url', type: 'string', value: '={{ $env.DCOS_SOURCE_API_BASE_URL || "" }}' },
            { id: 'ctx-10', name: 'default_channel_id', type: 'string', value: '={{ $env.DCOS_DEFAULT_CHANNEL_ID || "" }}' },
            { id: 'ctx-11', name: 'summary_channel_id', type: 'string', value: '={{ $env.DCOS_SUMMARY_CHANNEL_ID || "" }}' },
            { id: 'ctx-12', name: 'briefing_user_id', type: 'string', value: '={{ $env.DCOS_BRIEFING_USER_ID || "" }}' },
            { id: 'ctx-13', name: 'calendar_id', type: 'string', value: '={{ $env.DCOS_CALENDAR_ID || "" }}' },
          ],
        },
        options: {},
      },
      id: 'dcos-normalize-scheduled',
      name: 'Normalize Scheduled Trigger',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [-1280, -120],
    },
    {
      parameters: {
        jsCode:
          'const body = $json.body || {};\n' +
          'return [{ json: {\n' +
          '  workflow_id: "29-digital-chief-of-staff",\n' +
          '  workflow_name: "Digital Chief of Staff",\n' +
          '  mode: "production",\n' +
          '  trigger_type: "webhook",\n' +
          '  lookback_days: 7,\n' +
          '  delivery_mode: "slack_and_calendar",\n' +
          '  dry_run: $env.DCOS_DRY_RUN === "true",\n' +
          '  source_system: "crm_and_meeting_stack",\n' +
          '  source_api_base_url: $env.DCOS_SOURCE_API_BASE_URL || "",\n' +
          '  default_channel_id: body.channel_id || $env.DCOS_DEFAULT_CHANNEL_ID || "",\n' +
          '  summary_channel_id: body.channel_id || $env.DCOS_SUMMARY_CHANNEL_ID || "",\n' +
          '  briefing_user_id: body.user_id || $env.DCOS_BRIEFING_USER_ID || "",\n' +
          '  calendar_id: $env.DCOS_CALENDAR_ID || "",\n' +
          '  requested_prompt: body.text || ""\n' +
          '} }];',
      },
      id: 'dcos-normalize-webhook',
      name: 'Normalize Webhook Trigger',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [-1280, 280],
    },
    {
      parameters: {
        assignments: {
          assignments: [
            { id: 'acu-1', name: 'run_context', type: 'json', value: '={{ $json }}' },
            { id: 'acu-2', name: 'source_path', type: 'string', value: '/dcos/account-updates' },
            { id: 'acu-3', name: 'source_method', type: 'string', value: 'POST' },
            { id: 'acu-4', name: 'source_body', type: 'json', value: '={{ { lookback_days: $json.lookback_days, requested_prompt: $json.requested_prompt || "" } }}' },
          ],
        },
        options: {},
      },
      id: 'dcos-account-contract',
      name: 'Account Update Source Contract',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [-980, -120],
    },
    {
      parameters: {
        workflowId: {
          __rl: true,
          mode: 'id',
          value: '={{ $env.BACKSTORY_SHARED_SOURCE_ADAPTER_ID || "" }}',
        },
        options: {},
      },
      id: 'dcos-account-source',
      name: 'Load Account Update Inputs',
      type: 'n8n-nodes-base.executeWorkflow',
      typeVersion: 1.2,
      position: [-700, -120],
    },
    {
      parameters: {
        assignments: {
          assignments: [
            {
              id: 'aup-1',
              name: 'agent_prompt',
              type: 'string',
              value:
                '=Return strict JSON with keys title, body, target_type, thread_key, and account_name.\\n\\n' +
                'Create a concise customer-channel update from this normalized source record and the workflow context.\\n\\n' +
                'Run context:\\n{{ JSON.stringify($json.run_context || {}, null, 2) }}\\n\\n' +
                'Source record:\\n{{ JSON.stringify($json.raw_record || $json, null, 2) }}',
            },
          ],
        },
        options: {},
      },
      id: 'dcos-account-prompt',
      name: 'Build Account Update Prompt',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [-420, -120],
    },
    {
      parameters: {
        promptType: 'define',
        text: '={{ $json.agent_prompt }}',
        options: {
          systemMessage:
            'You are the Digital Chief of Staff account-update agent. Use MCP only for enrichment. Output JSON only.',
        },
      },
      id: 'dcos-account-agent',
      name: 'Generate Account Update',
      type: '@n8n/n8n-nodes-langchain.agent',
      typeVersion: 2,
      position: [-140, -120],
    },
    {
      parameters: {
        jsCode:
          'const item = $input.first().json;\n' +
          'const raw = item.output || item.text || item.response || item.message || "{}";\n' +
          'let parsed;\n' +
          'try { parsed = JSON.parse(raw); } catch (error) {\n' +
          '  parsed = { title: item.account_name || "Account Update", body: raw, target_type: "channel", thread_key: "" };\n' +
          '}\n' +
          'return [{ json: { ...item, ...parsed, target_type: parsed.target_type || "channel" } }];',
      },
      id: 'dcos-account-parse',
      name: 'Parse Account Update JSON',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [140, -120],
    },
    {
      parameters: {
        workflowId: {
          __rl: true,
          mode: 'id',
          value: '={{ $env.BACKSTORY_SHARED_IDENTITY_ROUTING_ID || "" }}',
        },
        options: {},
      },
      id: 'dcos-route-target',
      name: 'Resolve Delivery Target',
      type: 'n8n-nodes-base.executeWorkflow',
      typeVersion: 1.2,
      position: [420, -120],
    },
    {
      parameters: {
        workflowId: {
          __rl: true,
          mode: 'id',
          value: '={{ $env.BACKSTORY_SHARED_DELIVERY_RENDERER_ID || "" }}',
        },
        options: {},
      },
      id: 'dcos-render-payload',
      name: 'Render Delivery Payload',
      type: 'n8n-nodes-base.executeWorkflow',
      typeVersion: 1.2,
      position: [700, -120],
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
      id: 'dcos-post-account',
      name: 'Post Account Update',
      type: 'n8n-nodes-base.slack',
      typeVersion: 2.3,
      position: [980, -120],
    },
    {
      parameters: {
        assignments: {
          assignments: [
            { id: 'bri-1', name: 'run_context', type: 'json', value: '={{ $json }}' },
            { id: 'bri-2', name: 'source_path', type: 'string', value: '/dcos/daily-briefing' },
            { id: 'bri-3', name: 'source_method', type: 'string', value: 'POST' },
            { id: 'bri-4', name: 'source_body', type: 'json', value: '={{ { lookback_days: $json.lookback_days, requested_prompt: $json.requested_prompt || "" } }}' },
          ],
        },
        options: {},
      },
      id: 'dcos-briefing-contract',
      name: 'Briefing Source Contract',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [-980, 280],
    },
    {
      parameters: {
        workflowId: {
          __rl: true,
          mode: 'id',
          value: '={{ $env.BACKSTORY_SHARED_SOURCE_ADAPTER_ID || "" }}',
        },
        options: {},
      },
      id: 'dcos-briefing-source',
      name: 'Load Briefing Inputs',
      type: 'n8n-nodes-base.executeWorkflow',
      typeVersion: 1.2,
      position: [-700, 280],
    },
    {
      parameters: {
        assignments: {
          assignments: [
            {
              id: 'bri-5',
              name: 'agent_prompt',
              type: 'string',
              value:
                '=Return strict JSON with keys briefing, calendar_event, summary_detail, and delivery_target_type.\\n\\n' +
                'Create a daily chief-of-staff briefing from this normalized source record and workflow context.\\n\\n' +
                'Run context:\\n{{ JSON.stringify($json.run_context || {}, null, 2) }}\\n\\n' +
                'Source record:\\n{{ JSON.stringify($json.raw_record || $json, null, 2) }}',
            },
          ],
        },
        options: {},
      },
      id: 'dcos-briefing-prompt',
      name: 'Build Briefing Prompt',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [-420, 280],
    },
    {
      parameters: {
        promptType: 'define',
        text: '={{ $json.agent_prompt }}',
        options: {
          systemMessage:
            'You are the Digital Chief of Staff daily-briefing agent. Use MCP only for enrichment. Output JSON only.',
        },
      },
      id: 'dcos-briefing-agent',
      name: 'Generate Daily Briefing',
      type: '@n8n/n8n-nodes-langchain.agent',
      typeVersion: 2,
      position: [-140, 280],
    },
    {
      parameters: {
        jsCode:
          'const item = $input.first().json;\n' +
          'const raw = item.output || item.text || item.response || item.message || "{}";\n' +
          'let parsed;\n' +
          'try { parsed = JSON.parse(raw); } catch (error) {\n' +
          '  parsed = { briefing: raw, calendar_event: {}, summary_detail: "Completed briefing synthesis." };\n' +
          '}\n' +
          'return [{ json: { ...item, ...parsed } }];',
      },
      id: 'dcos-briefing-parse',
      name: 'Parse Briefing JSON',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [140, 280],
    },
    {
      parameters: {
        workflowId: {
          __rl: true,
          mode: 'id',
          value: '={{ $env.BACKSTORY_SHARED_CALENDAR_WRITER_ID || "" }}',
        },
        options: {},
      },
      id: 'dcos-calendar-write',
      name: 'Write Calendar Tasks',
      type: 'n8n-nodes-base.executeWorkflow',
      typeVersion: 1.2,
      position: [420, 280],
    },
    {
      parameters: {
        authentication: 'oAuth2',
        select: 'user',
        user: {
          __rl: true,
          mode: 'id',
          value: '={{ $json.briefing_user_id }}',
        },
        text: '={{ $json.briefing }}',
        otherOptions: {
          unfurl_links: false,
        },
      },
      id: 'dcos-dm-briefing',
      name: 'DM Daily Briefing',
      type: 'n8n-nodes-base.slack',
      typeVersion: 2.3,
      position: [700, 280],
    },
    {
      parameters: {
        workflowId: {
          __rl: true,
          mode: 'id',
          value: '={{ $env.BACKSTORY_SHARED_RUN_SUMMARY_ID || "" }}',
        },
        options: {},
      },
      id: 'dcos-run-summary',
      name: 'Build Run Summary',
      type: 'n8n-nodes-base.executeWorkflow',
      typeVersion: 1.2,
      position: [980, 280],
    },
    {
      parameters: {
        authentication: 'oAuth2',
        select: 'channel',
        channelId: {
          __rl: true,
          mode: 'id',
          value: '={{ $json.delivery_target.target_id || $json.summary_channel_id }}',
        },
        text: '={{ $json.summary_message }}',
        otherOptions: {
          unfurl_links: false,
        },
      },
      id: 'dcos-post-summary',
      name: 'Post Run Summary',
      type: 'n8n-nodes-base.slack',
      typeVersion: 2.3,
      position: [1260, 280],
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
      id: 'dcos-model',
      name: 'Anthropic Chat Model',
      type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
      typeVersion: 1.3,
      position: [-120, 520],
    },
    {
      parameters: {
        endpointUrl: 'https://mcp.backstory.ai/mcp',
        authentication: 'multipleHeadersAuth',
        options: {},
      },
      id: 'dcos-mcp',
      name: 'Backstory MCP',
      type: '@n8n/n8n-nodes-langchain.mcpClientTool',
      typeVersion: 1,
      position: [180, 520],
    },
  ],
  connections: {
    'Schedule Trigger': {
      main: [[{ node: 'Normalize Scheduled Trigger', type: 'main', index: 0 }]],
    },
    'Slash Command Trigger': {
      main: [
        [{ node: 'Respond to Slack', type: 'main', index: 0 }],
        [{ node: 'Normalize Webhook Trigger', type: 'main', index: 0 }],
      ],
    },
    'Normalize Scheduled Trigger': {
      main: [
        [{ node: 'Account Update Source Contract', type: 'main', index: 0 }],
        [{ node: 'Briefing Source Contract', type: 'main', index: 0 }],
      ],
    },
    'Normalize Webhook Trigger': {
      main: [
        [{ node: 'Account Update Source Contract', type: 'main', index: 0 }],
        [{ node: 'Briefing Source Contract', type: 'main', index: 0 }],
      ],
    },
    'Account Update Source Contract': {
      main: [[{ node: 'Load Account Update Inputs', type: 'main', index: 0 }]],
    },
    'Load Account Update Inputs': {
      main: [[{ node: 'Build Account Update Prompt', type: 'main', index: 0 }]],
    },
    'Build Account Update Prompt': {
      main: [[{ node: 'Generate Account Update', type: 'main', index: 0 }]],
    },
    'Anthropic Chat Model': {
      ai_languageModel: [
        [{ node: 'Generate Account Update', type: 'ai_languageModel', index: 0 }],
        [{ node: 'Generate Daily Briefing', type: 'ai_languageModel', index: 0 }],
      ],
    },
    'Backstory MCP': {
      ai_tool: [
        [{ node: 'Generate Account Update', type: 'ai_tool', index: 0 }],
        [{ node: 'Generate Daily Briefing', type: 'ai_tool', index: 0 }],
      ],
    },
    'Generate Account Update': {
      main: [[{ node: 'Parse Account Update JSON', type: 'main', index: 0 }]],
    },
    'Parse Account Update JSON': {
      main: [[{ node: 'Resolve Delivery Target', type: 'main', index: 0 }]],
    },
    'Resolve Delivery Target': {
      main: [[{ node: 'Render Delivery Payload', type: 'main', index: 0 }]],
    },
    'Render Delivery Payload': {
      main: [[{ node: 'Post Account Update', type: 'main', index: 0 }]],
    },
    'Briefing Source Contract': {
      main: [[{ node: 'Load Briefing Inputs', type: 'main', index: 0 }]],
    },
    'Load Briefing Inputs': {
      main: [[{ node: 'Build Briefing Prompt', type: 'main', index: 0 }]],
    },
    'Build Briefing Prompt': {
      main: [[{ node: 'Generate Daily Briefing', type: 'main', index: 0 }]],
    },
    'Generate Daily Briefing': {
      main: [[{ node: 'Parse Briefing JSON', type: 'main', index: 0 }]],
    },
    'Parse Briefing JSON': {
      main: [[{ node: 'Write Calendar Tasks', type: 'main', index: 0 }]],
    },
    'Write Calendar Tasks': {
      main: [[{ node: 'DM Daily Briefing', type: 'main', index: 0 }]],
    },
    'DM Daily Briefing': {
      main: [[{ node: 'Build Run Summary', type: 'main', index: 0 }]],
    },
    'Build Run Summary': {
      main: [[{ node: 'Post Run Summary', type: 'main', index: 0 }]],
    },
  },
});

function sanitizeDownloadedDcos() {
  if (!fs.existsSync(downloadSource)) {
    return dcosFull;
  }

  const workflow = JSON.parse(fs.readFileSync(downloadSource, 'utf8'));
  workflow.name = 'Digital Chief of Staff — Demo Starter';
  workflow.id = '29-digital-chief-of-staff-starter';
  workflow.versionId = '29-digital-chief-of-staff-starter-v1';
  workflow.active = false;
  delete workflow.tags;
  workflow.meta = {
    ...(workflow.meta || {}),
    templateCredsSetupCompleted: false,
  };

  for (const node of workflow.nodes || []) {
    delete node.credentials;
    if (node.name === 'Configuration' && node.parameters?.assignments?.assignments) {
      for (const assignment of node.parameters.assignments.assignments) {
        if (assignment.name === 'peopleaiClientId') assignment.value = 'YOUR_BACKSTORY_CLIENT_ID';
        if (assignment.name === 'peopleaiClientSecret') assignment.value = 'YOUR_BACKSTORY_CLIENT_SECRET';
        if (assignment.name === 'testChannelId') assignment.value = 'YOUR_SLACK_CHANNEL_ID';
        if (assignment.name === 'adminChannelId') assignment.value = 'YOUR_SLACK_USER_ID';
      }
    }
    if (node.name === 'Get PAI Token' && node.parameters?.assignments?.assignments) {
      for (const assignment of node.parameters.assignments.assignments) {
        if (assignment.name === 'access_token') assignment.value = 'DEMO_TOKEN';
      }
    }
    if (node.name === 'Post Briefing' && typeof node.parameters?.text === 'string') {
      node.parameters.text = '*Digital Chief of Staff — Demo Starter*\\n\\nReplace this canned briefing with your own fixtures or move to full.json for production use.';
    }
  }

  const sanitized = JSON.parse(
    JSON.stringify(workflow)
      .replaceAll('CFN912TS7', 'YOUR_SLACK_CHANNEL_ID')
      .replaceAll('U09GJRF2SSV', 'YOUR_SLACK_USER_ID')
      .replaceAll('james.mcdaniel@people.ai', 'YOUR_CALENDAR_ID'),
  );

  return sanitized;
}

function ensureCatalogEntry() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const existing = catalog.workflows.find((item) => item.id === '29-digital-chief-of-staff');
  if (existing) return;

  catalog.workflows.push({
    id: '29-digital-chief-of-staff',
    name: 'Digital Chief of Staff',
    description:
      'Reference-grade Digital Chief of Staff workflow that combines account-channel updates, executive briefing synthesis, and calendar task generation using shared n8n sub-workflows plus bounded MCP enrichment.',
    category: 'strategic-intelligence',
    trigger: 'Schedule or Slash Command                          |',
    output: 'Slack channel updates, direct-message briefing, and calendar tasks',
    credentials: [
      'Backstory MCP — Enrichment only',
      'LLM API (Claude, OpenAI, Gemini, etc.) — Structured synthesis',
      'Slack — Channel updates, DM delivery, and run summary',
      'Google Calendar — Task/event creation',
      'Source system adapter — CRM, meeting, or ops system payloads',
    ],
    node_flow: [
      { step: 1, name: 'Normalize Trigger', description: 'Converts schedule and slash-command entry points into a shared run_context contract.', type: 'trigger', color: 'green' },
      { step: 2, name: 'Source Adapter', description: 'Calls a shared source adapter sub-workflow to fetch normalized account-update and briefing inputs.', type: 'data', color: 'blue' },
      { step: 3, name: 'Account Update Synthesis', description: 'Uses agent + MCP only for enrichment and account-summary synthesis.', type: 'ai', color: 'purple' },
      { step: 4, name: 'Deterministic Routing', description: 'Resolves targets and builds delivery_payload objects via shared routing and renderer sub-workflows.', type: 'data', color: 'blue' },
      { step: 5, name: 'Native Delivery', description: 'Posts customer-channel updates and direct-message briefings using native Slack nodes.', type: 'output', color: 'orange' },
      { step: 6, name: 'Calendar Writer', description: 'Creates follow-up tasks through a shared native Google Calendar writer sub-workflow.', type: 'output', color: 'orange' },
      { step: 7, name: 'Run Summary', description: 'Builds a deterministic observability summary and posts it to the configured summary channel.', type: 'output', color: 'orange' },
    ],
    configuration: [
      'Shared sub-workflow IDs: Source adapter, routing, delivery renderer, calendar writer, run summary',
      'Source API base URL and source-path overrides',
      'Default channel, summary channel, and briefing user routing',
      'Lookback window and dry-run mode',
      'Calendar destination and task-writing behavior',
    ],
    quick_start_vs_full: '',
    sample_output: {
      mockup: 'slack',
      bot_name: 'Backstory',
      bot_app: true,
      content:
        '🧭 **Digital Chief of Staff** — Morning operating brief\\n\\n' +
        '• 3 customer-channel updates routed through shared delivery contracts\\n' +
        '• 1 executive briefing DM generated with MCP enrichment\\n' +
        '• 2 follow-up calendar tasks created via native Google Calendar\\n\\n' +
        '---\\n' +
        '*Hybrid control plane: deterministic delivery, agentic enrichment only*',
    },
    exports: ['full.json', 'starter.json', 'workato-guide.pdf', 'zapier-guide.pdf'],
    platforms: {
      n8n: 'full.json',
      'n8n-starter': 'starter.json',
      workato: 'workato-guide.pdf',
      zapier: 'zapier-guide.pdf',
      'recipe-card': 'recipe-card.md',
    },
    template_variants: [
      {
        id: 'n8n',
        platform: 'n8n',
        label: 'Production Template',
        description: 'Uses shared sub-workflows, native Slack/Google Calendar nodes, and standardized contracts.',
      },
      {
        id: 'n8n-starter',
        platform: 'n8n-starter',
        label: 'Demo Starter',
        description: 'Safe import based on the original demo workflow with credentials stripped and fixtures preserved.',
      },
      {
        id: 'workato',
        platform: 'workato',
        label: 'Workato PDF Guide',
        description: 'Branded Workato PDF guide covering Recipe Functions, custom connectors, package deployment, and native connector usage.',
      },
      {
        id: 'zapier',
        platform: 'zapier',
        label: 'Zapier PDF Guide',
        description: 'Branded Zapier PDF guide covering custom apps, Zap templates, native actions, and template restrictions.',
      },
    ],
  });

  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
}

function buildCatalogPlatformGuides() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  let generatedAssets = 0;
  let workflowCount = 0;

  for (const workflow of catalog.workflows) {
    if (workflow.id === '29-digital-chief-of-staff') continue;

    const workflowDir = path.join(repoRoot, workflow.id);
    const fullPath = path.join(workflowDir, 'full.json');
    if (!fs.existsSync(fullPath)) continue;

    fs.rmSync(path.join(workflowDir, 'workato-template.json'), { force: true });
    fs.rmSync(path.join(workflowDir, 'zapier-template.json'), { force: true });
    writeText(path.join(workflowDir, 'workato-guide.md'), buildWorkatoGuide(workflow));
    writeText(path.join(workflowDir, 'zapier-guide.md'), buildZapierGuide(workflow));
    generatedAssets += 2;
    workflowCount += 1;
  }

  return { generatedAssets, workflowCount };
}

const sharedReadme = `
# Shared n8n Sub-workflows

Import these workflows before importing production templates that depend on them.

Recommended import order:

1. \`source-adapter.json\`
2. \`backstory-enrichment.json\`
3. \`identity-channel-resolution.json\`
4. \`delivery-renderer.json\`
5. \`calendar-task-writer.json\`
6. \`run-summary-observability.json\`

After import, set the shared workflow IDs through environment variables instead of editing the JSON files directly:

- \`BACKSTORY_SHARED_SOURCE_ADAPTER_ID\`
- \`BACKSTORY_SHARED_IDENTITY_ROUTING_ID\`
- \`BACKSTORY_SHARED_DELIVERY_RENDERER_ID\`
- \`BACKSTORY_SHARED_CALENDAR_WRITER_ID\`
- \`BACKSTORY_SHARED_RUN_SUMMARY_ID\`
`;

const dcosSource = `
# 29 — Digital Chief of Staff

## Overview

This reference workflow is the production-grade answer to the original DCOS example. It separates demo-safe behavior from production behavior, moves repeated logic into shared sub-workflows, and keeps agent + MCP usage bounded to enrichment and synthesis.

## Attached Platform Assets

- \`full.json\`: production n8n template
- \`starter.json\`: demo-safe n8n starter
- \`workato-guide.pdf\`: branded Workato implementation guide PDF
- \`zapier-guide.pdf\`: branded Zapier implementation guide PDF

## Contracts

- \`run_context\`: trigger metadata, mode, lookback, delivery mode, and dry-run flag
- \`source_record\`: normalized account, opportunity, and ops inputs returned by the shared source adapter
- \`enrichment_context\`: MCP-only enrichment output used by the synthesis steps
- \`delivery_payload\`: deterministic Slack delivery contract consumed by native nodes

## Design Rules

1. Native Slack and Google Calendar nodes own delivery side effects.
2. Shared sub-workflows own source access, routing, rendering, calendar writing, and run summaries.
3. Agents return JSON only.
4. MCP nodes are attached only to the two synthesis steps.

## Required Shared Sub-workflows

- Shared — Source Adapter
- Shared — Identity And Channel Resolution
- Shared — Delivery Renderer
- Shared — Calendar And Task Writer
- Shared — Run Summary And Observability
`;

const dcosRecipe = `
# Digital Chief of Staff — Platform-Agnostic Recipe

## Reference Architecture

\`trigger -> normalize -> source adapter -> enrich -> analyze -> route -> deliver -> summarize\`

## Production Implementation Notes

- Use the production \`full.json\` in n8n when you can import shared sub-workflows and native Slack + Google Calendar credentials.
- Use \`starter.json\` when you need a safe sandbox import or a customer workshop artifact.
- Use \`workato-guide.pdf\` when you need branded, step-by-step Workato build instructions instead of a misleading JSON upload artifact.
- Use \`zapier-guide.pdf\` when you need branded, step-by-step Zapier build instructions that respect public-app and template restrictions.
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
`;

const dcosWorkatoTemplate = {
  template_version: '2026-05-16',
  platform: 'workato',
  template_type: 'native-blueprint',
  workflow_id: '29-digital-chief-of-staff',
  name: 'Digital Chief of Staff — Workato Native Blueprint',
  summary:
    'Production-grade Workato blueprint that uses Recipe Functions, a Backstory custom connector, and native Slack and Google Calendar connectors instead of generic HTTP steps.',
  official_references: [
    { label: 'Recipe function by Workato', url: 'https://docs.workato.com/connectors/recipe-functions.html' },
    { label: 'Create a Custom Connector', url: 'https://docs.workato.com/en/developing-connectors/custom-connector.html' },
    { label: 'Slack connector', url: 'https://docs.workato.com/connectors/slack.html' },
    { label: 'Google Calendar connector', url: 'https://docs.workato.com/en/connectors/google-calendar.html' },
  ],
  quality_bar: {
    native_connectors_required: [
      'Recipe function by Workato for reusable subflows',
      'Backstory custom connector built with the Connector SDK',
      'Slack connector or Workbot for Slack for channel and DM delivery',
      'Google Calendar connector for task and event creation',
    ],
    prohibited_patterns: [
      'No repeated Universal HTTP or custom-action calls for Slack delivery',
      'No repeated raw HTTP calls for Google Calendar writes',
      'No credentials stored in formula literals, project properties, or step comments',
      'No agent output sent directly to transport without JSON schema validation',
    ],
  },
  contracts: ['run_context', 'source_record', 'enrichment_context', 'delivery_payload'],
  recipe_functions: [
    {
      key: 'normalize_run_context',
      purpose: 'Normalize schedule and manual invocations into one run_context object.',
      inputs: ['trigger_type', 'requested_prompt', 'lookback_days', 'delivery_mode', 'dry_run'],
      outputs: ['run_context'],
      native_features: ['Recipe function by Workato', 'Variables', 'Formula mode'],
    },
    {
      key: 'load_account_update_inputs',
      purpose: 'Return normalized source_record items for account-channel updates.',
      inputs: ['run_context'],
      outputs: ['source_record[]'],
      native_features: ['Backstory custom connector action', 'Lists', 'Transform actions'],
    },
    {
      key: 'load_daily_briefing_inputs',
      purpose: 'Return normalized source_record items for the executive briefing and task plan.',
      inputs: ['run_context'],
      outputs: ['source_record[]'],
      native_features: ['Backstory custom connector action', 'Lists', 'Transform actions'],
    },
    {
      key: 'resolve_delivery_target',
      purpose: 'Map account and owner data to the final Slack destination.',
      inputs: ['source_record', 'run_context'],
      outputs: ['delivery_target'],
      native_features: ['Lookup tables or data stores', 'Formula mode'],
    },
    {
      key: 'render_delivery_payload',
      purpose: 'Convert structured synthesis JSON into the delivery_payload contract.',
      inputs: ['structured_summary_json', 'delivery_target'],
      outputs: ['delivery_payload'],
      native_features: ['Recipe functions', 'Object construction'],
    },
    {
      key: 'post_run_summary',
      purpose: 'Publish the deterministic summary of the run to the configured summary channel.',
      inputs: ['run_context', 'execution_metrics'],
      outputs: ['delivery_result'],
      native_features: ['Slack connector'],
    },
  ],
  main_recipes: [
    {
      key: 'scheduled_morning_run',
      trigger: 'Scheduler by Workato',
      steps: [
        'Call normalize_run_context',
        'Call load_account_update_inputs',
        'Repeat through source_record items',
        'Call Backstory custom connector actions for enrichment',
        'Use LLM connector or AI step to return strict JSON for the account update',
        'Call resolve_delivery_target and render_delivery_payload',
        'Post to Slack using the Slack connector',
        'Call load_daily_briefing_inputs',
        'Use LLM connector or AI step to return strict JSON for the briefing',
        'Create Google Calendar events with the Google Calendar connector',
        'Send DM briefing using the Slack connector',
        'Call post_run_summary',
      ],
    },
    {
      key: 'manual_briefing_request',
      trigger: 'API Platform endpoint or Slack/Workbot command trigger',
      steps: [
        'Call normalize_run_context with trigger_type=manual',
        'Reuse the same recipe functions as the scheduled recipe',
        'Skip channel fan-out when the request is explicitly single-user',
      ],
    },
  ],
  ai_contracts: {
    account_update_json: {
      required_keys: ['title', 'body', 'target_type', 'thread_key', 'account_name'],
      output_mode: 'json_only',
    },
    daily_briefing_json: {
      required_keys: ['briefing', 'calendar_events', 'summary_detail'],
      output_mode: 'json_only',
    },
  },
  deployment_notes: [
    'Use project properties or connection objects for routing defaults and source base URLs.',
    'Expose Backstory through a custom connector or approved connector package, not scattered HTTP actions.',
    'Prefer Recipe Functions over legacy callable recipes for new builds.',
  ],
};

const dcosZapierTemplate = {
  template_version: '2026-05-16',
  platform: 'zapier',
  template_type: 'native-blueprint-bundle',
  workflow_id: '29-digital-chief-of-staff',
  name: 'Digital Chief of Staff — Zapier Native Blueprint',
  summary:
    'Native-first Zapier blueprint bundle for DCOS. Uses a published custom Zapier app for Backstory actions, native Slack and Google Calendar apps, and Zapier-native control surfaces instead of a brittle webhooks-and-code stack.',
  official_references: [
    { label: 'Zapier action design', url: 'https://docs.zapier.com/integrations/build/action' },
    { label: 'Add a create action', url: 'https://docs.zapier.com/integrations/build/create' },
    { label: 'AI actions', url: 'https://docs.zapier.com/integrations/reference/ai-actions' },
    { label: 'Zap templates restrictions', url: 'https://docs.zapier.com/integrations/publish/zap-templates' },
    { label: 'Custom actions and API requests actions', url: 'https://docs.zapier.com/integrations/reference/custom-actions-api-requests' },
  ],
  quality_bar: {
    native_connectors_required: [
      'Published Backstory custom Zapier integration with search and create actions',
      'Slack app actions for channel posts and direct messages',
      'Google Calendar app actions for event creation',
      'Zapier Tables or another native Zapier store for state, dedupe, or routing maps where needed',
    ],
    prohibited_patterns: [
      'Do not use Webhooks by Zapier as the primary production shell for Backstory lookups if a reusable custom app can be published instead',
      'Do not use raw API Requests or Custom Actions as the long-term production answer for a new integration',
      'Do not use Webhooks, Code, Looping, Formatter, or Paths as the basis for a published reusable Zap template',
      'Do not send unvalidated LLM text straight to Slack or Calendar actions',
    ],
    template_constraints: [
      'Zapier public Zap templates currently cannot include Paths by Zapier, Code by Zapier, Webhooks by Zapier, Looping by Zapier, or Formatter by Zapier.',
      'Because of that restriction, this asset is a native blueprint bundle, not a claim that the full DCOS can ship as one public single-Zap template without decomposition.',
    ],
  },
  contracts: ['run_context', 'source_record', 'enrichment_context', 'delivery_payload'],
  custom_app_actions: [
    'search_account',
    'get_recent_account_activity',
    'get_account_status',
    'list_account_update_inputs',
    'list_daily_briefing_inputs',
  ],
  blueprint_bundle: [
    {
      key: 'scheduled_channel_updates_zap',
      trigger: 'Schedule by Zapier',
      native_steps: [
        'Backstory custom app action: list_account_update_inputs',
        'LLM step or AI Actions-backed structured generation returning account update JSON',
        'Slack action: Send Channel Message',
      ],
      notes: 'Use one Zap per bounded behavior if public template constraints prevent packaging the whole workflow as a single reusable Zap.',
    },
    {
      key: 'manual_briefing_request_zap',
      trigger: 'Slack native trigger or Zapier Interfaces form/button, depending workspace constraints',
      native_steps: [
        'Backstory custom app action: list_daily_briefing_inputs',
        'LLM step or AI Actions-backed structured generation returning briefing JSON',
        'Slack action: Send Direct Message',
        'Google Calendar action: Create Detailed Event',
      ],
    },
    {
      key: 'run_summary_zap',
      trigger: 'Subsequent success event from the scheduled flow or a native table/state change',
      native_steps: ['Build summary payload from structured fields', 'Slack action: Send Channel Message'],
    },
  ],
  ai_contracts: {
    account_update_json: {
      required_keys: ['title', 'body', 'target_type', 'thread_key', 'account_name'],
      output_mode: 'json_only',
    },
    daily_briefing_json: {
      required_keys: ['briefing', 'calendar_events', 'summary_detail'],
      output_mode: 'json_only',
    },
  },
  deployment_notes: [
    'If Backstory is not yet a published Zapier integration, build it as a private Zapier app with explicit actions rather than relying on API Request steps.',
    'Use Zapier AI Actions only as an assistant surface over explicit app actions, not as a substitute for delivery routing and state handling.',
    'For reusable public templates, keep each Zap within the product restrictions documented by Zapier and compose multi-Zap bundles where needed.',
  ],
};

ensureDir(sharedDir);
ensureDir(dcosDir);

for (const [fileName, workflow] of Object.entries(sharedWorkflows)) {
  writeJson(path.join(sharedDir, fileName), workflow);
}
writeText(path.join(sharedDir, 'README.md'), sharedReadme);

writeJson(path.join(dcosDir, 'full.json'), dcosFull);
writeJson(path.join(dcosDir, 'starter.json'), sanitizeDownloadedDcos());
fs.rmSync(path.join(dcosDir, 'workato-template.json'), { force: true });
fs.rmSync(path.join(dcosDir, 'zapier-template.json'), { force: true });
writeText(path.join(dcosDir, 'workato-guide.md'), buildWorkatoGuide({ id: '29-digital-chief-of-staff', name: 'Digital Chief of Staff', category: 'strategic-intelligence', description: 'Reference-grade Digital Chief of Staff workflow that combines account-channel updates, executive briefing synthesis, and calendar task generation using shared n8n sub-workflows plus bounded MCP enrichment.', trigger: 'Schedule or Slash Command', output: 'Slack channel updates, direct-message briefing, and calendar tasks', credentials: ['Backstory MCP — Enrichment only', 'LLM API (Claude, OpenAI, Gemini, etc.) — Structured synthesis', 'Slack — Channel updates, DM delivery, and run summary', 'Google Calendar — Task/event creation', 'Source system adapter — CRM, meeting, or ops system payloads'], configuration: ['Shared sub-workflow IDs: Source adapter, routing, delivery renderer, calendar writer, run summary', 'Source API base URL and source-path overrides', 'Default channel, summary channel, and briefing user routing', 'Lookback window and dry-run mode', 'Calendar destination and task-writing behavior'], node_flow: [{ step: 1, name: 'Normalize Trigger', description: 'Converts schedule and slash-command entry points into a shared run_context contract.', type: 'trigger' }, { step: 2, name: 'Source Adapter', description: 'Calls a shared source adapter sub-workflow to fetch normalized account-update and briefing inputs.', type: 'data' }, { step: 3, name: 'Account Update Synthesis', description: 'Uses agent + MCP only for enrichment and account-summary synthesis.', type: 'ai' }, { step: 4, name: 'Deterministic Routing', description: 'Resolves targets and builds delivery_payload objects via shared routing and renderer sub-workflows.', type: 'data' }, { step: 5, name: 'Native Delivery', description: 'Posts customer-channel updates and direct-message briefings using native Slack nodes.', type: 'output' }, { step: 6, name: 'Calendar Writer', description: 'Creates follow-up tasks through a shared native Google Calendar writer sub-workflow.', type: 'output' }, { step: 7, name: 'Run Summary', description: 'Builds a deterministic observability summary and posts it to the configured summary channel.', type: 'output' }] }));
writeText(path.join(dcosDir, 'zapier-guide.md'), buildZapierGuide({ id: '29-digital-chief-of-staff', name: 'Digital Chief of Staff', category: 'strategic-intelligence', description: 'Reference-grade Digital Chief of Staff workflow that combines account-channel updates, executive briefing synthesis, and calendar task generation using shared n8n sub-workflows plus bounded MCP enrichment.', trigger: 'Schedule or Slash Command', output: 'Slack channel updates, direct-message briefing, and calendar tasks', credentials: ['Backstory MCP — Enrichment only', 'LLM API (Claude, OpenAI, Gemini, etc.) — Structured synthesis', 'Slack — Channel updates, DM delivery, and run summary', 'Google Calendar — Task/event creation', 'Source system adapter — CRM, meeting, or ops system payloads'], configuration: ['Shared sub-workflow IDs: Source adapter, routing, delivery renderer, calendar writer, run summary', 'Source API base URL and source-path overrides', 'Default channel, summary channel, and briefing user routing', 'Lookback window and dry-run mode', 'Calendar destination and task-writing behavior'], node_flow: [{ step: 1, name: 'Normalize Trigger', description: 'Converts schedule and slash-command entry points into a shared run_context contract.', type: 'trigger' }, { step: 2, name: 'Source Adapter', description: 'Calls a shared source adapter sub-workflow to fetch normalized account-update and briefing inputs.', type: 'data' }, { step: 3, name: 'Account Update Synthesis', description: 'Uses agent + MCP only for enrichment and account-summary synthesis.', type: 'ai' }, { step: 4, name: 'Deterministic Routing', description: 'Resolves targets and builds delivery_payload objects via shared routing and renderer sub-workflows.', type: 'data' }, { step: 5, name: 'Native Delivery', description: 'Posts customer-channel updates and direct-message briefings using native Slack nodes.', type: 'output' }, { step: 6, name: 'Calendar Writer', description: 'Creates follow-up tasks through a shared native Google Calendar writer sub-workflow.', type: 'output' }, { step: 7, name: 'Run Summary', description: 'Builds a deterministic observability summary and posts it to the configured summary channel.', type: 'output' }] }));
writeText(path.join(dcosDir, 'SOURCE.md'), dcosSource);
writeText(path.join(dcosDir, 'recipe-card.md'), dcosRecipe);

ensureCatalogEntry();
const platformGuides = buildCatalogPlatformGuides();
const cleanedLegacyWorkflows = rebuildStandardN8nWorkflows(repoRoot);

console.log(
  JSON.stringify(
    {
      sharedAssets: Object.keys(sharedWorkflows).length,
      dcosAssets: ['full.json', 'starter.json', 'workato-guide.md', 'zapier-guide.md', 'SOURCE.md', 'recipe-card.md'],
      platformGuides,
      cleanedLegacyWorkflows,
    },
    null,
    2,
  ),
);
