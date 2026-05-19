import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inferWorkflowCapabilities } from './workflow-platform-helpers.mjs';

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

let issueCount = 0;
const summaries = [];

for (const workflowId of workflowDirs) {
  const fullPath = path.join(repoRoot, workflowId, 'full.json');
  if (!fs.existsSync(fullPath)) continue;
  const starterPath = path.join(repoRoot, workflowId, 'starter.json');
  const raw = fs.readFileSync(fullPath, 'utf8');
  const workflow = JSON.parse(raw);
  const nodes = workflow.nodes || [];
  const issues = [];

  const codeNodes = nodes.filter((node) => node.type === 'n8n-nodes-base.code');
  if (codeNodes.length > maxCodeNodes) {
    issues.push(`code node count ${codeNodes.length} exceeds limit ${maxCodeNodes}`);
  }

  const httpUrls = nodes
    .filter((node) => node.type === 'n8n-nodes-base.httpRequest')
    .map((node) => String(node.parameters?.url || ''))
    .filter(Boolean);
  for (const url of httpUrls) {
    if (forbiddenNativeBypassPatterns.some((pattern) => pattern.test(url))) {
      issues.push(`native-node bypass via raw HTTP request: ${url}`);
    }
  }

  if (!fs.existsSync(starterPath)) {
    issues.push('missing starter.json variant');
  }

  const metadata = catalog.workflows.find((item) => item.id === workflowId);

  const workatoPath = path.join(repoRoot, workflowId, 'workato-guide.md');
  if (fs.existsSync(workatoPath)) {
    issues.push(...validatePlatformGuide(workatoPath, 'workato', metadata || { id: workflowId }));
  }

  const zapierPath = path.join(repoRoot, workflowId, 'zapier-guide.md');
  if (fs.existsSync(zapierPath)) {
    issues.push(...validatePlatformGuide(zapierPath, 'zapier', metadata || { id: workflowId }));
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
    if (metadata.platforms?.n8n !== 'full.json') {
      issues.push('workflows.json n8n platform is not mapped to full.json');
    }
    if (metadata.platforms?.['n8n-starter'] !== 'starter.json') {
      issues.push('workflows.json n8n-starter platform is not mapped to starter.json');
    }
    if (fs.existsSync(workatoPath) && metadata.platforms?.workato !== 'workato-guide.md') {
      issues.push('workflows.json workato platform is not mapped to workato-guide.md');
    }
    if (fs.existsSync(zapierPath) && metadata.platforms?.zapier !== 'zapier-guide.md') {
      issues.push('workflows.json zapier platform is not mapped to zapier-guide.md');
    }
    if (!Array.isArray(metadata.template_variants) || metadata.template_variants.length < 2) {
      issues.push('template_variants metadata is missing');
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
