import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

function validatePlatformBlueprint(filePath, platform) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  const issues = [];

  if (parsed.platform !== platform) {
    issues.push(`${path.basename(filePath)} platform field is not ${platform}`);
  }
  if (!String(parsed.template_type || '').includes('blueprint')) {
    issues.push(`${path.basename(filePath)} is missing a blueprint template_type`);
  }
  if (!parsed.quality_bar || !Array.isArray(parsed.quality_bar.prohibited_patterns)) {
    issues.push(`${path.basename(filePath)} is missing quality_bar.prohibited_patterns`);
  }
  if (!Array.isArray(parsed.contracts) || parsed.contracts.length < 4) {
    issues.push(`${path.basename(filePath)} is missing contract declarations`);
  }

  const connectionBlob = JSON.stringify(parsed).toLowerCase();
  if (!connectionBlob.includes('slack')) issues.push(`${path.basename(filePath)} does not declare Slack usage`);
  if (!connectionBlob.includes('google calendar') && !connectionBlob.includes('google_calendar')) {
    issues.push(`${path.basename(filePath)} does not declare Google Calendar usage`);
  }
  if (!connectionBlob.includes('backstory')) issues.push(`${path.basename(filePath)} does not declare Backstory usage`);

  if (platform === 'workato' && !connectionBlob.includes('custom connector')) {
    issues.push(`${path.basename(filePath)} does not require a Workato custom connector for Backstory`);
  }
  if (platform === 'zapier' && !connectionBlob.includes('custom zapier integration') && !connectionBlob.includes('custom zapier app')) {
    issues.push(`${path.basename(filePath)} does not require a custom Zapier integration/app`);
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

  const workatoPath = path.join(repoRoot, workflowId, 'workato-template.json');
  if (fs.existsSync(workatoPath)) {
    issues.push(...validatePlatformBlueprint(workatoPath, 'workato'));
  }

  const zapierPath = path.join(repoRoot, workflowId, 'zapier-template.json');
  if (fs.existsSync(zapierPath)) {
    issues.push(...validatePlatformBlueprint(zapierPath, 'zapier'));
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

  const metadata = catalog.workflows.find((item) => item.id === workflowId);
  if (!metadata) {
    issues.push('missing workflows.json metadata entry');
  } else {
    if (metadata.platforms?.n8n !== 'full.json') {
      issues.push('workflows.json n8n platform is not mapped to full.json');
    }
    if (metadata.platforms?.['n8n-starter'] !== 'starter.json') {
      issues.push('workflows.json n8n-starter platform is not mapped to starter.json');
    }
    if (fs.existsSync(workatoPath) && metadata.platforms?.workato !== 'workato-template.json') {
      issues.push('workflows.json workato platform is not mapped to workato-template.json');
    }
    if (fs.existsSync(zapierPath) && metadata.platforms?.zapier !== 'zapier-template.json') {
      issues.push('workflows.json zapier platform is not mapped to zapier-template.json');
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
