import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inferWorkflowCapabilities } from './workflow-platform-helpers.mjs';
import {
  PLATFORM_STATUS_VALUES,
  PUBLIC_N8N_WORKFLOW_IDS,
  buildPlatformStatusMap,
} from './workflow-rollout-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const catalogPath = path.join(repoRoot, 'workflows.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const workflowFlag = process.argv.indexOf('--workflow');
const scopedWorkflow = workflowFlag >= 0 ? process.argv[workflowFlag + 1] : '';
const allowedCodeFlag = process.argv.indexOf('--max-code-nodes');
const maxCodeNodes = allowedCodeFlag >= 0 ? Number(process.argv[allowedCodeFlag + 1]) : 4;

const workflowDirs = (scopedWorkflow
  ? [scopedWorkflow]
  : fs
      .readdirSync(repoRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
      .map((entry) => entry.name)
      .sort()
).filter(Boolean);

const hardcodedSecretPatterns = [
  /"peopleaiClientSecret"\s*:\s*"(?!(?:YOUR_|REPLACE_|DEMO_|sandbox_|example))/i,
  /"backstoryClientSecret"\s*:\s*"(?!(?:YOUR_|REPLACE_|DEMO_|sandbox_|example))/i,
  /\bxox[baprs]-[A-Za-z0-9-]+/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/,
];

const idPatterns = [
  /\bC[A-Z0-9]{4,}\d[A-Z0-9]{3,}\b/,
  /\bU[A-Z0-9]{4,}\d[A-Z0-9]{3,}\b/,
  /\bG[A-Z0-9]{4,}\d[A-Z0-9]{3,}\b/,
];

const forbiddenNativeBypassPatterns = [
  /https:\/\/slack\.com\/api\/chat\.postMessage/i,
  /https:\/\/slack\.com\/api\/conversations\.list/i,
  /https:\/\/slack\.com\/api\/users\.list/i,
  /graph\.microsoft\.com\/v1\.0\/me\/calendarView/i,
  /googleapis\.com\/calendar/i,
];

const requiredNativeCredentials = new Map([
  ['@n8n/n8n-nodes-langchain.lmChatAnthropic', ['anthropicApi']],
  ['@n8n/n8n-nodes-langchain.mcpClientTool', ['httpMultipleHeadersAuth']],
  ['@n8n/n8n-nodes-langchain.mcpClient', ['httpMultipleHeadersAuth', 'mcpOAuth2Api']],
  ['n8n-nodes-base.slack', ['slackOAuth2Api']],
  ['n8n-nodes-base.googleTasks', ['googleTasksOAuth2Api']],
  ['n8n-nodes-base.googleCalendar', ['googleCalendarOAuth2Api']],
  ['n8n-nodes-base.emailSend', ['smtp']],
]);

const productionPlaceholderPatterns = [
  /REPLACE_WITH_SHARED_/,
  /YOUR_[A-Z0-9_]+/,
  /demo\.backstory\.local/i,
  /demo@example\.com/i,
  /https:\/\/your-[a-z0-9.-]+\.example\.com/i,
  /https:\/\/[a-z0-9-]+\.example\.com/i,
];

function validatePlatformGuide(filePath, platform, workflow) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  const capabilities = inferWorkflowCapabilities(workflow);
  const text = raw.toLowerCase();

  if (!text.includes('plain-english implementation guide') && !text.includes('plain english implementation guide')) {
    issues.push(`${path.basename(filePath)} does not identify itself as a plain-English implementation guide`);
  }
  if (!text.includes('not an importable json')) {
    issues.push(`${path.basename(filePath)} does not explain that it is not an importable JSON artifact`);
  }
  for (const contract of ['run_context', 'source_record', 'enrichment_context', 'delivery_payload']) {
    if (!text.includes(contract)) {
      issues.push(`${path.basename(filePath)} is missing ${contract}`);
    }
  }

  if (capabilities.backstory && !text.includes('backstory')) {
    issues.push(`${path.basename(filePath)} does not declare Backstory usage`);
  }
  if (capabilities.slack && !text.includes('slack')) {
    issues.push(`${path.basename(filePath)} does not declare Slack usage`);
  }
  if (capabilities.teams && !text.includes('teams')) {
    issues.push(`${path.basename(filePath)} does not declare Teams usage`);
  }
  if (capabilities.email && !/(email|gmail|outlook|smtp)/.test(text)) {
    issues.push(`${path.basename(filePath)} does not declare email usage`);
  }
  if (capabilities.googleCalendar && !text.includes('google calendar') && !text.includes('google_calendar')) {
    issues.push(`${path.basename(filePath)} does not declare Google Calendar usage`);
  } else if (capabilities.calendar && !text.includes('calendar')) {
    issues.push(`${path.basename(filePath)} does not declare calendar usage`);
  }
  if (capabilities.crm && !/(crm|salesforce|hubspot|dynamics)/.test(text)) {
    issues.push(`${path.basename(filePath)} does not declare CRM usage`);
  }
  if (capabilities.jira && !text.includes('jira')) {
    issues.push(`${path.basename(filePath)} does not declare Jira usage`);
  }
  if (capabilities.asana && !text.includes('asana')) {
    issues.push(`${path.basename(filePath)} does not declare Asana usage`);
  }
  if (capabilities.linear && !text.includes('linear')) {
    issues.push(`${path.basename(filePath)} does not declare Linear usage`);
  }
  if (platform === 'workato') {
    if (!text.includes('recipe function')) {
      issues.push(`${path.basename(filePath)} does not mention Recipe Functions`);
    }
    if (!text.includes('recipe lifecycle management') && !text.includes('.zip')) {
      issues.push(`${path.basename(filePath)} does not explain Workato package import behavior`);
    }
  }
  if (capabilities.backstory && platform === 'workato' && !text.includes('custom connector')) {
    issues.push(`${path.basename(filePath)} does not require a Workato custom connector for Backstory`);
  }
  if (
    capabilities.backstory &&
    platform === 'zapier' &&
    !text.includes('custom zapier integration') &&
    !text.includes('custom zapier app')
  ) {
    issues.push(`${path.basename(filePath)} does not require a custom Zapier integration/app`);
  }
  if (platform === 'zapier') {
    if (!text.includes('zap template')) {
      issues.push(`${path.basename(filePath)} does not mention Zap templates`);
    }
    if (!text.includes('public integrations') && !text.includes('public apps')) {
      issues.push(`${path.basename(filePath)} does not explain public-integration/public-app requirements`);
    }
    if (!text.includes('code') || !text.includes('webhook')) {
      issues.push(`${path.basename(filePath)} does not explain restricted Zapier steps`);
    }
  }

  return issues;
}

function validateNativeNodeParity(nodes, variantLabel) {
  const issues = [];

  for (const node of nodes) {
    if (node.type === 'n8n-nodes-base.httpRequest') {
      const url = String(node.parameters?.url || '');
      if (forbiddenNativeBypassPatterns.some((pattern) => pattern.test(url))) {
        issues.push(`${variantLabel} native-node bypass via raw HTTP request: ${url}`);
      }
    }

    const requiredKeys = requiredNativeCredentials.get(node.type);
    if (!requiredKeys) continue;

    const hasCredential = requiredKeys.some((key) => Boolean(node.credentials?.[key]?.name));
    if (!hasCredential) {
      issues.push(
        `${variantLabel} native node "${node.name}" (${node.type}) is missing credential reference ${requiredKeys.join(' or ')}`,
      );
    }
  }

  return issues;
}

let issueCount = 0;
const summaries = [];

if (catalog._generator !== 'scripts/build-catalog.mjs') {
  summaries.push({
    workflowId: '_catalog',
    issues: ['workflows.json _generator is not set to scripts/build-catalog.mjs'],
  });
  issueCount += 1;
}

for (const workflowId of workflowDirs) {
  const fullPath = path.join(repoRoot, workflowId, 'full.json');
  if (!fs.existsSync(fullPath)) continue;
  const starterPath = path.join(repoRoot, workflowId, 'starter.json');
  const raw = fs.readFileSync(fullPath, 'utf8');
  const workflow = JSON.parse(raw);
  const nodes = workflow.nodes || [];
  const issues = [];
  const starterRaw = fs.existsSync(starterPath) ? fs.readFileSync(starterPath, 'utf8') : '';
  const starterWorkflow = starterRaw ? JSON.parse(starterRaw) : null;
  const n8nIsPublic = PUBLIC_N8N_WORKFLOW_IDS.has(workflowId);

  const codeNodes = nodes.filter((node) => node.type === 'n8n-nodes-base.code');
  if (codeNodes.length > maxCodeNodes) {
    issues.push(`code node count ${codeNodes.length} exceeds limit ${maxCodeNodes}`);
  }

  issues.push(...validateNativeNodeParity(nodes, 'full.json'));
  if (starterWorkflow) {
    issues.push(...validateNativeNodeParity(starterWorkflow.nodes || [], 'starter.json'));
  }

  if (!fs.existsSync(starterPath)) {
    issues.push('missing starter.json variant');
  }

  const metadata = catalog.workflows.find((item) => item.id === workflowId);
  const workatoPath = path.join(repoRoot, workflowId, 'workato-guide.md');
  const zapierPath = path.join(repoRoot, workflowId, 'zapier-guide.md');
  const workatoPdfPath = path.join(repoRoot, workflowId, 'workato-guide.pdf');
  const zapierPdfPath = path.join(repoRoot, workflowId, 'zapier-guide.pdf');

  if (fs.existsSync(workatoPath)) {
    issues.push(...validatePlatformGuide(workatoPath, 'workato', metadata || { id: workflowId }));
  }

  if (fs.existsSync(zapierPath)) {
    issues.push(...validatePlatformGuide(zapierPath, 'zapier', metadata || { id: workflowId }));
  }

  if (fs.existsSync(workatoPath) && !fs.existsSync(workatoPdfPath)) {
    issues.push('missing generated workato-guide.pdf');
  }
  if (fs.existsSync(zapierPath) && !fs.existsSync(zapierPdfPath)) {
    issues.push('missing generated zapier-guide.pdf');
  }

  if (n8nIsPublic) {
    if (/starter/i.test(workflow.name) || /starter/i.test(workflow.id) || /starter/i.test(String(workflow.versionId || ''))) {
      issues.push('public full.json still contains starter wording in name, id, or versionId');
    }
    if (starterRaw && raw === starterRaw) {
      issues.push('public full.json is byte-identical to starter.json');
    }
    for (const pattern of productionPlaceholderPatterns) {
      if (pattern.test(raw)) {
        issues.push(`public full.json still exposes placeholder/demo configuration matched ${pattern}`);
        break;
      }
    }
  }

  for (const pattern of hardcodedSecretPatterns) {
    if (pattern.test(raw)) {
      issues.push(`possible hardcoded secret matched ${pattern}`);
      break;
    }
  }

  for (const pattern of idPatterns) {
    if (pattern.test(raw) && !/YOUR_SLACK_(?:CHANNEL|USER)_ID/.test(raw)) {
      issues.push(`possible hardcoded Slack identifier matched ${pattern}`);
      break;
    }
  }

  if (!metadata) {
    issues.push('missing workflows.json metadata entry');
  } else {
    const expectedStatuses = buildPlatformStatusMap(metadata);
    if (metadata.platforms?.n8n !== 'full.json') {
      issues.push('workflows.json n8n platform is not mapped to full.json');
    }
    if (metadata.platforms?.['n8n-starter'] !== 'starter.json') {
      issues.push('workflows.json n8n-starter platform is not mapped to starter.json');
    }
    if (fs.existsSync(workatoPath) && metadata.platforms?.workato !== 'workato-guide.pdf') {
      issues.push('workflows.json workato platform is not mapped to workato-guide.pdf');
    }
    if (fs.existsSync(zapierPath) && metadata.platforms?.zapier !== 'zapier-guide.pdf') {
      issues.push('workflows.json zapier platform is not mapped to zapier-guide.pdf');
    }
    if (!Array.isArray(metadata.template_variants) || metadata.template_variants.length < 2) {
      issues.push('template_variants metadata is missing');
    }
    if (!metadata.platform_status || typeof metadata.platform_status !== 'object') {
      issues.push('platform_status metadata is missing');
    } else {
      for (const [platformId, status] of Object.entries(metadata.platform_status)) {
        if (!PLATFORM_STATUS_VALUES.has(status)) {
          issues.push(`platform_status for ${platformId} has invalid value ${status}`);
        }
      }
      for (const [platformId, status] of Object.entries(expectedStatuses)) {
        if (metadata.platform_status?.[platformId] !== status) {
          issues.push(`platform_status for ${platformId} should be ${status}`);
        }
      }
    }
    if (!Array.isArray(metadata.rollout_blockers)) {
      issues.push('rollout_blockers metadata is missing');
    }
    if (fs.existsSync(workatoPdfPath) && !(metadata.exports || []).includes('workato-guide.pdf')) {
      issues.push('workflows.json exports are missing workato-guide.pdf');
    }
    if (fs.existsSync(zapierPdfPath) && !(metadata.exports || []).includes('zapier-guide.pdf')) {
      issues.push('workflows.json exports are missing zapier-guide.pdf');
    }
  }

  if (issues.length > 0) {
    issueCount += issues.length;
    summaries.push({ workflowId, issues });
  }
}

if (summaries.length === 0) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        scanned: workflowDirs.length,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.log(
  JSON.stringify(
    {
      ok: false,
      scanned: workflowDirs.length,
      issueCount,
      workflows: summaries,
    },
    null,
    2,
  ),
);
process.exit(1);
