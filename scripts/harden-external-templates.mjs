import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * harden-external-templates.mjs
 *
 * Idempotent post-processor that makes every workflow template ready for
 * external-customer use with minimal configuration:
 *
 *   Tier 1  Genuinely demo-safe starter.json (offline fixtures + dry-run) so a
 *           starter import produces immediate results without a customer backend.
 *   Tier 2  Replaces generic HTTP "Fetch Source Records" nodes (which targeted
 *           fictional crm/email/calendar endpoints) with real native n8n nodes
 *           (Salesforce / HubSpot / Microsoft Outlook / Google Sheets) so a
 *           customer connects their actual system via OAuth, no middleware.
 *   Tier 3  Pre-wires named credential placeholders on every native node so the
 *           customer creates each credential once instead of per node.
 *   Tier 4  Hygiene: converts the last raw Slack HTTP node to native Slack and
 *           bumps the Anthropic chat model to the current default.
 *
 * Safe to run repeatedly; every transform checks whether it has already been
 * applied. Runs late in scripts/build-catalog.mjs.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Tier 4 — current model default
// ---------------------------------------------------------------------------
const LEGACY_ANTHROPIC_MODELS = new Set([
  'claude-sonnet-4-5-20250929',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-latest',
]);
const CURRENT_ANTHROPIC_MODEL = {
  value: 'claude-sonnet-4-6',
  cachedResultName: 'Claude Sonnet 4.6',
};

// ---------------------------------------------------------------------------
// Tier 3 — credential placeholders the audit expects (id is a non-secret hint)
// ---------------------------------------------------------------------------
const CREDENTIAL_PLACEHOLDER = (key, name) => ({
  [key]: { id: 'connect-your-credential', name },
});
const NATIVE_CREDENTIALS = new Map([
  ['@n8n/n8n-nodes-langchain.lmChatAnthropic', ['anthropicApi', 'Anthropic account']],
  ['@n8n/n8n-nodes-langchain.mcpClientTool', ['httpMultipleHeadersAuth', 'Backstory MCP header auth']],
  ['@n8n/n8n-nodes-langchain.mcpClient', ['httpMultipleHeadersAuth', 'Backstory MCP header auth']],
  ['n8n-nodes-base.slack', ['slackOAuth2Api', 'Slack account']],
  ['n8n-nodes-base.emailSend', ['smtp', 'SMTP account']],
  ['n8n-nodes-base.googleCalendar', ['googleCalendarOAuth2Api', 'Google Calendar account']],
  ['n8n-nodes-base.googleTasks', ['googleTasksOAuth2Api', 'Google Tasks account']],
  ['n8n-nodes-base.salesforce', ['salesforceOAuth2Api', 'Salesforce account']],
  ['n8n-nodes-base.hubspot', ['hubspotOAuth2Api', 'HubSpot account']],
  ['n8n-nodes-base.microsoftOutlook', ['microsoftOutlookOAuth2Api', 'Microsoft Outlook account']],
  ['n8n-nodes-base.googleSheets', ['googleSheetsOAuth2Api', 'Google Sheets account']],
  ['n8n-nodes-base.gmail', ['gmailOAuth2', 'Gmail account']],
]);

// ---------------------------------------------------------------------------
// Tier 2 — per-workflow native source decision (Family A: HTTP "Fetch Source
// Records" nodes). Chosen per workflow with a documented alternative.
// ---------------------------------------------------------------------------
const SALESFORCE_ACCOUNT = {
  type: 'n8n-nodes-base.salesforce',
  typeVersion: 1,
  parameters: { resource: 'account', operation: 'getAll', returnAll: false, limit: 50, options: {} },
  note:
    'Native Salesforce node (Account → Get All). Connect your Salesforce OAuth2 credential. ' +
    'Alternative: swap for the HubSpot or Microsoft Dynamics node — the downstream "Normalize Source Records" step accepts any record shape.',
};
const SALESFORCE_OPPORTUNITY = {
  type: 'n8n-nodes-base.salesforce',
  typeVersion: 1,
  parameters: { resource: 'opportunity', operation: 'getAll', returnAll: false, limit: 50, options: {} },
  note:
    'Native Salesforce node (Opportunity → Get All). Connect your Salesforce OAuth2 credential. ' +
    'Alternative: swap for the HubSpot Deals or Microsoft Dynamics node — Normalize accepts any record shape.',
};
const HUBSPOT_CONTACT = {
  type: 'n8n-nodes-base.hubspot',
  typeVersion: 2.1,
  parameters: { resource: 'contact', operation: 'getAll', returnAll: false, limit: 50, additionalFields: {}, options: {} },
  note:
    'Native HubSpot node (Contact → Get All) for marketing/MQL signals. Connect your HubSpot OAuth2 credential. ' +
    'Alternative: swap for the Salesforce Lead/Campaign node.',
};
const OUTLOOK_MESSAGE = {
  type: 'n8n-nodes-base.microsoftOutlook',
  typeVersion: 2,
  parameters: { resource: 'message', operation: 'getAll', returnAll: false, limit: 25, filtersUI: {}, options: {} },
  note:
    'Native Microsoft Outlook node (Message → Get All) reading the executive inbox. Connect your Microsoft Outlook OAuth2 credential. ' +
    'Alternative: swap for the Gmail node (Message → Get All).',
};
const OUTLOOK_EVENT = {
  type: 'n8n-nodes-base.microsoftOutlook',
  typeVersion: 2,
  parameters: { resource: 'event', operation: 'getAll', returnAll: false, limit: 25, options: {} },
  note:
    'Native Microsoft Outlook node (Calendar event → Get All). Connect your Microsoft Outlook OAuth2 credential. ' +
    'Alternative: swap for the Google Calendar node (Event → Get Many).',
};
const GOOGLE_SHEETS_ROSTER = {
  type: 'n8n-nodes-base.googleSheets',
  typeVersion: 4.5,
  parameters: {
    operation: 'read',
    documentId: { __rl: true, mode: 'url', value: '' },
    sheetName: { __rl: true, mode: 'list', value: '' },
    options: {},
  },
  note:
    'Native Google Sheets node (Read rows) holding the digest subscriber roster. Connect your Google Sheets OAuth2 credential and point it at your roster sheet. ' +
    'Alternative: swap for an Airtable, NocoDB, or Salesforce Users node.',
};

const NATIVE_SOURCE_MAP = new Map([
  ['01-sales-digest', GOOGLE_SHEETS_ROSTER],
  ['02-meeting-brief', OUTLOOK_EVENT],
  ['03-silence-contract-monitor', SALESFORCE_ACCOUNT],
  ['06-executive-inbox', OUTLOOK_MESSAGE],
  ['07-churn-risk-scorecard', SALESFORCE_ACCOUNT],
  ['08-renewal-prep-brief', SALESFORCE_ACCOUNT],
  ['09-onboarding-pulse', SALESFORCE_ACCOUNT],
  ['10-activity-gap-detector', SALESFORCE_ACCOUNT],
  ['11-deal-hygiene-audit', SALESFORCE_OPPORTUNITY],
  ['12-win-loss-debrief', SALESFORCE_OPPORTUNITY],
  ['13-competitive-displacement-alert', SALESFORCE_ACCOUNT],
  ['14-territory-heat-map', SALESFORCE_ACCOUNT],
  ['15-qbr-auto-prep', OUTLOOK_EVENT],
  ['16-executive-sponsor-tracker', SALESFORCE_OPPORTUNITY],
  ['17-marketing-sales-handoff-scorer', HUBSPOT_CONTACT],
]);

// ---------------------------------------------------------------------------
// Tier 1 — demo fixtures per workflow domain (offline, no customer backend)
// ---------------------------------------------------------------------------
const DEMO_FIXTURES = {
  account: [
    { id: 'demo-acct-1', accountName: 'Globex Industries', owner: 'sarah.chen', arr: 340000, renewalDate: '2026-08-08', healthScore: 6, region: 'AMER' },
    { id: 'demo-acct-2', accountName: 'Initech', owner: 'david.park', arr: 128000, renewalDate: '2026-07-22', healthScore: 4, region: 'EMEA' },
    { id: 'demo-acct-3', accountName: 'Umbrella Health', owner: 'maria.gomez', arr: 512000, renewalDate: '2026-09-30', healthScore: 8, region: 'AMER' },
  ],
  opportunity: [
    { id: 'demo-opp-1', opportunityName: 'Globex — Platform Expansion', accountName: 'Globex Industries', amount: 90000, stage: 'Proposal', closeDate: '2026-07-31', owner: 'sarah.chen' },
    { id: 'demo-opp-2', opportunityName: 'Initech — Renewal + Add-on', accountName: 'Initech', amount: 42000, stage: 'Negotiation', closeDate: '2026-07-15', owner: 'david.park' },
  ],
  message: [
    { id: 'demo-msg-1', subject: 'Re: Q3 rollout timeline', from: 'cfo@globex.com', receivedAt: '2026-06-24T14:02:00Z', bodyPreview: 'Can we confirm the security review is on track before sign-off?' },
    { id: 'demo-msg-2', subject: 'Renewal paperwork', from: 'procurement@initech.com', receivedAt: '2026-06-24T16:40:00Z', bodyPreview: 'Legal flagged two redlines on the MSA — see attached.' },
  ],
  event: [
    { id: 'demo-evt-1', subject: 'Globex QBR', start: '2026-06-26T15:00:00Z', attendees: ['cfo@globex.com', 'champion@globex.com'], accountName: 'Globex Industries' },
    { id: 'demo-evt-2', subject: 'Initech renewal sync', start: '2026-06-27T17:00:00Z', attendees: ['procurement@initech.com'], accountName: 'Initech' },
  ],
  roster: [
    { id: 'demo-sub-1', name: 'RevOps Daily', channel: 'YOUR_SLACK_CHANNEL_ID', owner: 'revops@your-company.com' },
    { id: 'demo-sub-2', name: 'AE Pod West', channel: 'YOUR_SLACK_CHANNEL_ID', owner: 'sarah.chen@your-company.com' },
  ],
  generic: [
    { id: 'demo-rec-1', name: 'Demo Record One', summary: 'Representative sample record for sandbox runs.' },
    { id: 'demo-rec-2', name: 'Demo Record Two', summary: 'Second sample record so aggregation has more than one item.' },
  ],
};

function fixtureKindFor(nativeSource) {
  if (!nativeSource) return 'generic';
  if (nativeSource === GOOGLE_SHEETS_ROSTER) return 'roster';
  if (nativeSource === OUTLOOK_MESSAGE) return 'message';
  if (nativeSource === OUTLOOK_EVENT) return 'event';
  if (nativeSource === SALESFORCE_OPPORTUNITY) return 'opportunity';
  return 'account';
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function listWorkflowDirs() {
  return fs
    .readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function ensureCredential(node) {
  const spec = NATIVE_CREDENTIALS.get(node.type);
  if (!spec) return false;
  const [key, name] = spec;
  if (node.credentials?.[key]?.name) return false;
  node.credentials = { ...(node.credentials || {}), ...CREDENTIAL_PLACEHOLDER(key, name) };
  return true;
}

function bumpModel(node) {
  if (node.type !== '@n8n/n8n-nodes-langchain.lmChatAnthropic') return false;
  const model = node.parameters?.model;
  if (!model || typeof model !== 'object') return false;
  if (!LEGACY_ANTHROPIC_MODELS.has(model.value)) return false;
  model.value = CURRENT_ANTHROPIC_MODEL.value;
  model.cachedResultName = CURRENT_ANTHROPIC_MODEL.cachedResultName;
  return true;
}

function convertRawSlackHttpNode(node) {
  if (node.type !== 'n8n-nodes-base.httpRequest') return false;
  if (!String(node.parameters?.url || '').includes('https://slack.com/api/chat.postMessage')) return false;

  let channelExpr = '';
  let textExpr = '';
  // n8n bodies are often expressions that begin with "="; strip it for parsing.
  const jsonBody = String(node.parameters?.jsonBody || '').replace(/^=/, '');

  if (jsonBody.includes('slackPayload')) {
    channelExpr = '={{ JSON.parse($json.slackPayload).channel }}';
    textExpr = '={{ JSON.parse($json.slackPayload).text || JSON.parse($json.slackPayload).blocks?.[0]?.text?.text || "" }}';
  } else if (jsonBody.trim().startsWith('{')) {
    // Inline JSON body (e.g. revenue-orchestration approval request).
    const channelMatch = jsonBody.match(/"channel"\s*:\s*"([^"]+)"/);
    const textMatch = jsonBody.match(/"text"\s*:\s*"([\s\S]*?)"\s*,\s*\n\s*"blocks"/);
    channelExpr = channelMatch ? channelMatch[1] : 'YOUR_SLACK_CHANNEL_ID';
    textExpr = textMatch ? `=${textMatch[1].replace(/\\"/g, '"')}` : '=Review and approve in Slack';
  } else {
    return false;
  }

  node.type = 'n8n-nodes-base.slack';
  node.typeVersion = 2.3;
  node.parameters = {
    authentication: 'oAuth2',
    select: 'channel',
    channelId: { __rl: true, mode: 'id', value: channelExpr },
    text: textExpr,
    otherOptions: { unfurl_links: false },
  };
  ensureCredential(node);
  node.notes = 'Converted from raw Slack HTTP delivery to the native Slack node.';
  node.notesInFlow = true;
  return true;
}

function spliceNodeOut(workflow, nodeName) {
  const node = (workflow.nodes || []).find((candidate) => candidate.name === nodeName);
  if (!node) return false;
  const downstream = workflow.connections?.[nodeName]?.main?.[0] || [];

  // Re-point everything that fed this node at this node's downstream targets.
  for (const [, conn] of Object.entries(workflow.connections || {})) {
    for (const outputs of conn.main || []) {
      if (!Array.isArray(outputs)) continue;
      for (let i = outputs.length - 1; i >= 0; i -= 1) {
        if (outputs[i]?.node === nodeName) {
          outputs.splice(i, 1, ...downstream.map((target) => ({ ...target })));
        }
      }
    }
  }
  delete workflow.connections[nodeName];
  workflow.nodes = workflow.nodes.filter((candidate) => candidate.name !== nodeName);
  return true;
}

function stripSecretParameters(workflow) {
  const drop = new Set([
    'backstoryClientId',
    'backstoryClientSecret',
    'peopleaiClientId',
    'peopleaiClientSecret',
    'sourceApiToken',
    'crmApiBaseUrl',
    'emailApiBaseUrl',
    'calendarApiBaseUrl',
    'configApiBaseUrl',
    'sourceApiBaseUrl',
  ]);
  let changed = false;
  for (const node of workflow.nodes || []) {
    const assignments = node.parameters?.assignments?.assignments;
    if (!Array.isArray(assignments)) continue;
    const next = assignments.filter((assignment) => !drop.has(assignment.name));
    if (next.length !== assignments.length) {
      node.parameters.assignments.assignments = next;
      changed = true;
    }
  }
  return changed;
}

function applyNativeSource(workflow, nativeSource) {
  const node = (workflow.nodes || []).find((candidate) => candidate.name === 'Fetch Source Records');
  if (!node) return false;
  if (node.type === nativeSource.type && node.parameters?.resource === nativeSource.parameters?.resource) {
    return false; // already converted
  }
  node.type = nativeSource.type;
  node.typeVersion = nativeSource.typeVersion;
  node.parameters = JSON.parse(JSON.stringify(nativeSource.parameters));
  node.notes = nativeSource.note;
  node.notesInFlow = true;
  delete node.credentials;
  ensureCredential(node);
  // The Backstory token fetch only existed to authorize the old generic HTTP
  // call; native nodes carry their own OAuth credential, so remove it.
  spliceNodeOut(workflow, 'Get Backstory Auth Token');
  stripSecretParameters(workflow);
  return true;
}

function hardenNodes(workflow) {
  let changed = false;
  for (const node of workflow.nodes || []) {
    if (convertRawSlackHttpNode(node)) changed = true;
    if (bumpModel(node)) changed = true;
    if (ensureCredential(node)) changed = true;
  }
  return changed;
}

function buildDemoStarter(fullWorkflow, workflowId, nativeSource) {
  const starter = JSON.parse(JSON.stringify(fullWorkflow));
  if (!/demo starter/i.test(starter.name || '')) {
    starter.name = `${(starter.name || workflowId).replace(/\s+—\s+.*$/, '')} — Demo Starter`;
  }
  starter.versionId = `${workflowId}-starter`;

  // Replace the live data source with an offline fixture loader so the starter
  // runs end-to-end without any customer backend (only an Anthropic credential
  // is needed to see live AI output).
  const fixtureKind = fixtureKindFor(nativeSource);
  const records = DEMO_FIXTURES[fixtureKind] || DEMO_FIXTURES.generic;
  const loaderCode =
    'return ' +
    JSON.stringify(records.map((record) => ({ json: record }))) +
    ';';

  const sourceNode = (starter.nodes || []).find((candidate) => candidate.name === 'Fetch Source Records');
  if (sourceNode) {
    sourceNode.type = 'n8n-nodes-base.code';
    sourceNode.typeVersion = 2;
    sourceNode.parameters = { jsCode: loaderCode };
    sourceNode.notes = 'Demo Starter: returns offline sample records so the workflow runs without a connected system. Replace with the production native source node (see full.json) before go-live.';
    sourceNode.notesInFlow = true;
    delete sourceNode.credentials;
  }

  // Flip any test/dry-run flags on so the starter never performs real side effects unexpectedly.
  for (const node of starter.nodes || []) {
    const assignments = node.parameters?.assignments?.assignments;
    if (!Array.isArray(assignments)) continue;
    for (const assignment of assignments) {
      if (/^(testMode|dry_run|dryRun)$/.test(assignment.name)) {
        assignment.value = true;
        assignment.type = 'boolean';
      }
    }
  }
  return starter;
}

export function hardenExternalTemplates() {
  const summary = { hardenedFull: 0, nativeSources: 0, rebuiltStarters: 0, workflows: [] };

  for (const workflowId of listWorkflowDirs()) {
    const dir = path.join(repoRoot, workflowId);
    const fullPath = path.join(dir, 'full.json');
    const starterPath = path.join(dir, 'starter.json');
    if (!fs.existsSync(fullPath)) continue;

    const full = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const nativeSource = NATIVE_SOURCE_MAP.get(workflowId) || null;
    const actions = [];

    if (hardenNodes(full)) actions.push('hardened-nodes');
    if (nativeSource && applyNativeSource(full, nativeSource)) {
      actions.push(`native-source:${nativeSource.type.split('.').pop()}`);
      summary.nativeSources += 1;
    }

    fs.writeFileSync(fullPath, `${JSON.stringify(full, null, 2)}\n`);
    summary.hardenedFull += 1;

    // Only rebuild the starter for the standard single-source families. The
    // env-var public templates (04/05/18/30) and adaptation plumbing (19-28)
    // already ship purpose-built starters from their generators.
    const ownsStarterRebuild = NATIVE_SOURCE_MAP.has(workflowId);
    if (ownsStarterRebuild) {
      const starter = buildDemoStarter(full, workflowId, nativeSource);
      fs.writeFileSync(starterPath, `${JSON.stringify(starter, null, 2)}\n`);
      summary.rebuiltStarters += 1;
    } else if (fs.existsSync(starterPath)) {
      // Still harden credentials/model/slack on the existing starter.
      const starter = JSON.parse(fs.readFileSync(starterPath, 'utf8'));
      if (hardenNodes(starter)) {
        fs.writeFileSync(starterPath, `${JSON.stringify(starter, null, 2)}\n`);
      }
    }

    if (actions.length) summary.workflows.push({ workflowId, actions });
  }

  return summary;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(hardenExternalTemplates(), null, 2));
}
