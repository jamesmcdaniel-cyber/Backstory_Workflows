import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(__dirname, '..');

export const UTILITY_PARITY_IDS = [
  '19-customer-stack-blueprint', '20-crm-signal-normalizer', '21-meeting-intelligence-normalizer',
  '22-multi-channel-delivery-router', '23-identity-resolution-hub', '24-workflow-contract-validator',
  '25-implementation-gap-audit', '26-orchestrator-migration-planner', '27-adapter-regression-monitor',
  '28-rollout-readiness-scorecard',
  '31-deal-inspection', '32-revenue-orchestration', '33-prospecting-brief', '34-manager-coaching-brief',
  '35-grounded-follow-up', '36-pipeline-forecast-digest', '37-deal-risk-next-actions', '38-account-planning-strategy',
];

const DELIVERY_NODE_TYPES = new Set(['n8n-nodes-base.httpRequest', 'n8n-nodes-base.slack', 'n8n-nodes-base.emailSend', 'n8n-nodes-base.gmail', 'n8n-nodes-base.microsoftTeams']);

const prefixFor = (id) => id.replace(/^\d+-/, '').split('-').map((part) => part[0]).join('').toUpperCase();
const envName = (prefix, name) => `${prefix}_${String(name).replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}`;

function workflowConfigNode(workflow) {
  return workflow.nodes.find((node) => node.name === 'Workflow Parameters' || /Configuration/.test(node.name));
}

function hardenConfig(workflow, prefix, starter) {
  const node = workflowConfigNode(workflow);
  const assignments = node?.parameters?.assignments?.assignments;
  if (!Array.isArray(assignments)) return false;
  let dryRun = assignments.find((item) => /^(dry_run|dryRun|testMode)$/.test(item.name));
  if (!dryRun) {
    dryRun = { name: 'dry_run', type: 'boolean', value: starter ? true : `={{ $env.${prefix}_DRY_RUN !== "false" }}` };
    assignments.push(dryRun);
  } else {
    dryRun.type = 'boolean';
    dryRun.value = starter ? true : `={{ $env.${prefix}_DRY_RUN !== "false" }}`;
  }
  for (const assignment of assignments) {
    if (!/(url|token|secret|api.?key|store)/i.test(assignment.name) && !/^https?:\/\//i.test(String(assignment.value || ''))) continue;
    assignment.value = starter ? '' : `={{ $env.${envName(prefix, assignment.name)} || "" }}`;
    assignment.type = 'string';
  }
  return true;
}

function replaceTarget(workflow, targetName, replacementName) {
  for (const connectionGroup of Object.values(workflow.connections || {})) {
    for (const output of connectionGroup.main || []) {
      for (const target of output || []) if (target.node === targetName) target.node = replacementName;
    }
  }
}

function removeExistingDeliveryGates(workflow) {
  const gates = workflow.nodes.filter((node) => /Delivery Enabled/.test(node.name) && node.type === 'n8n-nodes-base.if');
  for (const gate of gates) {
    const target = workflow.connections?.[gate.name]?.main?.[0]?.[0]?.node;
    if (target) replaceTarget(workflow, gate.name, target);
    delete workflow.connections[gate.name];
  }
  workflow.nodes = workflow.nodes.filter((node) => !gates.includes(node));
}

function addDeliveryGate(workflow, sink, prefix, usesConfig, multiple) {
  const gateName = multiple ? `Delivery Enabled — ${sink.name}?` : 'Delivery Enabled?';
  const downstream = workflow.connections?.[sink.name]?.main?.[0] || [];
  const gate = {
    parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [
      { id: `${prefix}-${sink.id}-gate-1`, leftValue: usesConfig ? `={{ $('Workflow Parameters').first().json.dry_run }}` : `={{ $env.${prefix}_DRY_RUN !== "false" }}`, rightValue: '', operator: { type: 'boolean', operation: 'false', singleValue: true } },
      { id: `${prefix}-${sink.id}-gate-2`, leftValue: `={{ Boolean($json) }}`, rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } },
    ], combinator: 'and' }, options: {} },
    id: `${prefix.toLowerCase()}-delivery-gate-${sink.id}`, name: gateName, type: 'n8n-nodes-base.if', typeVersion: 2.2,
    position: [(sink.position?.[0] || 900) - 220, sink.position?.[1] || 240],
  };
  replaceTarget(workflow, sink.name, gateName);
  workflow.nodes.push(gate);
  workflow.connections[gateName] = { main: [[{ node: sink.name, type: 'main', index: 0 }], downstream.map((target) => ({ ...target }))] };
}

function replaceProductionPlaceholders(value, prefix, starter = false) {
  if (Array.isArray(value)) return value.map((item) => replaceProductionPlaceholders(item, prefix, starter));
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) value[key] = replaceProductionPlaceholders(item, prefix, starter);
    return value;
  }
  if (typeof value !== 'string') return value;
  const channel = starter ? '' : `={{ $env.${prefix}_DEFAULT_CHANNEL_ID || "" }}`;
  const user = starter ? '' : `={{ $env.${prefix}_DEFAULT_USER_ID || "" }}`;
  const publicBase = starter ? '' : `={{ $env.${prefix}_N8N_PUBLIC_BASE_URL || "" }}`;
  if (value === 'YOUR_SLACK_CHANNEL_ID') return channel;
  if (value === 'YOUR_SLACK_USER_ID') return user;
  if (/^https:\/\/YOUR_N8N_PUBLIC_BASE_URL\/?$/.test(value)) return publicBase;
  return value
    .replace(/'YOUR_SLACK_CHANNEL_ID'/g, starter ? "''" : `($env.${prefix}_DEFAULT_CHANNEL_ID || '')`)
    .replace(/'YOUR_SLACK_USER_ID'/g, starter ? "''" : `($env.${prefix}_DEFAULT_USER_ID || '')`)
    .replace(/'https:\/\/YOUR_N8N_PUBLIC_BASE_URL'/g, starter ? "''" : `($env.${prefix}_N8N_PUBLIC_BASE_URL || '')`)
    .replace(/YOUR_SLACK_CHANNEL_ID/g, starter ? '' : `$env.${prefix}_DEFAULT_CHANNEL_ID`)
    .replace(/YOUR_SLACK_USER_ID/g, starter ? '' : `$env.${prefix}_DEFAULT_USER_ID`)
    .replace(/https:\/\/YOUR_N8N_PUBLIC_BASE_URL/g, starter ? '' : `$env.${prefix}_N8N_PUBLIC_BASE_URL`);
}

function addBackstoryMcp(workflow, prefix) {
  if (workflow.nodes.some((node) => /mcpClient/.test(node.type))) return;
  const agent = workflow.nodes.find((node) => node.type === '@n8n/n8n-nodes-langchain.agent');
  if (!agent) return;
  const name = 'Backstory MCP';
  workflow.nodes.push({
    parameters: { endpointUrl: 'https://mcp.people.ai/mcp', authentication: 'multipleHeadersAuth', options: {} },
    id: `${prefix.toLowerCase()}-mcp`, name, type: '@n8n/n8n-nodes-langchain.mcpClientTool', typeVersion: 1.1,
    position: [(agent.position?.[0] || 600) + 180, (agent.position?.[1] || 240) + 220],
    notes: 'Backstory MCP is available only for factual library, account, and workflow enrichment. It must not perform delivery side effects.', notesInFlow: true,
  });
  workflow.connections[name] = { ai_tool: [[{ node: agent.name, type: 'ai_tool', index: 0 }]] };
}

function hardenFull(workflow, id) {
  const prefix = prefixFor(id);
  workflow.name = `${workflow.name.replace(/\s*(?:-|—)\s*Backstory Starter.*$/i, '').replace(/\s*—\s*(?:Demo Starter|Pilot Template|Production Template).*$/i, '')} — Production Template`;
  workflow.id = `${id}-production`;
  workflow.versionId = `${id}-production-v3`;
  workflow.active = false;
  workflow.meta = { ...(workflow.meta || {}), templateCredsSetupCompleted: false, demoStarter: false };
  const usesConfig = hardenConfig(workflow, prefix, false);
  replaceProductionPlaceholders(workflow, prefix, false);
  addBackstoryMcp(workflow, prefix);
  const httpNodes = workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.httpRequest');
  for (const node of httpNodes) {
    node.parameters.authentication = 'genericCredentialType';
    node.parameters.genericAuthType = 'httpHeaderAuth';
    node.credentials = { httpHeaderAuth: { id: 'configure-http-auth', name: 'HTTP Header Auth' } };
  }
  removeExistingDeliveryGates(workflow);
  const deliveryNodes = workflow.nodes.filter((node) =>
    (node.type === 'n8n-nodes-base.httpRequest' && !workflow.connections?.[node.name]?.main?.some((output) => output?.length)) ||
    (DELIVERY_NODE_TYPES.has(node.type) && node.type !== 'n8n-nodes-base.httpRequest'),
  );
  for (const node of deliveryNodes) addDeliveryGate(workflow, node, prefix, usesConfig, deliveryNodes.length > 1);
}

function hardenStarter(workflow, id) {
  const prefix = prefixFor(id);
  workflow.name = `${workflow.name.replace(/\s*(?:-|—)\s*Backstory Starter.*$/i, '').replace(/\s*—\s*(?:Demo Starter|Pilot Template|Production Template).*$/i, '')} — Demo Starter`;
  workflow.id = `${id}-starter`;
  workflow.versionId = `${id}-starter-v3`;
  workflow.active = false;
  workflow.meta = { ...(workflow.meta || {}), templateCredsSetupCompleted: false, demoStarter: true };
  hardenConfig(workflow, prefix, true);
  replaceProductionPlaceholders(workflow, prefix, true);
  for (const node of workflow.nodes) {
    if (node.type === '@n8n/n8n-nodes-langchain.mcpClient') {
      node.type = 'n8n-nodes-base.code';
      node.typeVersion = 2;
      node.parameters = { jsCode: `return [{ json: { ...$json, source_id: 'fictional-${id}-mcp-1', customerName: 'Globex Industries', accountName: 'Globex Industries', content: [{ type: 'text', text: JSON.stringify({ fictional: true, records: [{ id: 'fictional-1', status: 'test' }] }) }], dry_run: true } }];` };
      delete node.credentials;
      node.notes = 'Demo Starter: direct MCP access replaced with a fictional local fixture.';
      node.notesInFlow = true;
      continue;
    }
    if (!DELIVERY_NODE_TYPES.has(node.type)) continue;
    const isSink = node.type !== 'n8n-nodes-base.httpRequest' || !workflow.connections?.[node.name]?.main?.some((output) => output?.length);
    node.type = isSink ? 'n8n-nodes-base.noOp' : 'n8n-nodes-base.code';
    node.typeVersion = 2;
    node.parameters = isSink ? {} : { jsCode: `return [{ json: { source_id: 'fictional-${id}-1', customerName: 'Globex Industries', accountName: 'Globex Industries', records: [{ id: 'fictional-1', status: 'test' }], dry_run: true } }];` };
    delete node.credentials;
    node.notes = isSink ? 'Demo Starter: external delivery is disabled.' : 'Demo Starter: external source replaced with a fictional local fixture.';
    node.notesInFlow = true;
  }
}

export function hardenPilotParity(repoRoot = defaultRepoRoot) {
  for (const id of UTILITY_PARITY_IDS) {
    const fullPath = path.join(repoRoot, id, 'full.json');
    const starterPath = path.join(repoRoot, id, 'starter.json');
    const full = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const starter = JSON.parse(fs.readFileSync(starterPath, 'utf8'));
    hardenFull(full, id);
    hardenStarter(starter, id);
    fs.writeFileSync(fullPath, `${JSON.stringify(full, null, 2)}\n`);
    fs.writeFileSync(starterPath, `${JSON.stringify(starter, null, 2)}\n`);
  }
  return { updated: UTILITY_PARITY_IDS, workflowCount: UTILITY_PARITY_IDS.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(hardenPilotParity(), null, 2));
