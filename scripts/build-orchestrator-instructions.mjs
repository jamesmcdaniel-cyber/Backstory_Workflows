import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const catalogPath = path.join(repoRoot, 'workflows.json');

const writeText = (target, value) => fs.writeFileSync(target, `${value.trimStart()}\n`);

const formatList = (items, fallback = '- Not specified') => {
  const values = (items || []).filter(Boolean);
  return values.length ? values.map((item) => `- ${item}`).join('\n') : fallback;
};

const formatNodeFlow = (steps) => {
  const values = (steps || []).filter(Boolean);
  if (!values.length) return '- Not specified';
  return values
    .map((step) => {
      const stepNumber = step.step ? `${step.step}. ` : '';
      const type = step.type ? ` (${step.type})` : '';
      return `${stepNumber}${step.name || 'Workflow Step'}${type}: ${step.description || ''}`.trim();
    })
    .join('\n');
};

const markdownCodeBlock = (value) => {
  if (!value) return '';
  return ['```text', value, '```'].join('\n');
};

const sampleOutput = (workflow) => {
  const content = workflow.sample_output?.content;
  if (!content) return 'No sample output is defined in the catalog. Produce a concise operator-ready report.';
  return markdownCodeBlock(content);
};

const sharedInstructions = (workflow) => `
## Workflow Context

Workflow ID: ${workflow.id}
Workflow name: ${workflow.name}
Category: ${workflow.category || 'workflow'}
Trigger: ${workflow.trigger || 'Configured by orchestrator'}
Delivery target: ${workflow.output || 'Configured by orchestrator'}

## Purpose

${workflow.description || 'Run this workflow using the configured source, Backstory context, analysis, and delivery tools.'}

## Required Tools And Connections

${formatList(workflow.credentials)}

## Configurable Inputs

${formatList(workflow.configuration)}

## Workflow Steps

${formatNodeFlow(workflow.node_flow)}

## Tool Use Rules

- Use Backstory MCP for account, opportunity, activity, stakeholder, and relationship enrichment.
- Use native orchestrator connectors for Slack, email, calendar, task, CRM, and meeting-system actions whenever those connectors exist.
- Do not use raw HTTP/API request steps for delivery surfaces that have a native connector.
- Keep source-system adapters deterministic. Use AI only for synthesis, scoring, summarization, and recommendation text.
- If a source record is incomplete, state what is missing and continue with the evidence available.
- Keep final output concise enough for the configured delivery surface.

## Output Requirements

- Start with the workflow name and the highest-priority finding.
- Group findings by urgency or workflow-specific status when appropriate.
- Include concrete account names, owners, stages, dates, amounts, or source references when available.
- End with specific next actions and owners.
- Avoid speculative claims. Mark low-confidence findings clearly.

## Reference Output

${sampleOutput(workflow)}
`;

function buildClaudeInstructions(workflow) {
  return `
# ${workflow.name} - Claude Workflow Instructions

Paste this into the Claude workflow or orchestrator instruction field for this workflow. Configure the listed tools/connectors separately in the orchestrator.

## Role

You are Claude running the ${workflow.name} workflow for a revenue team. Your job is to gather the configured source records, enrich them with Backstory context, synthesize the important signal, and return an operator-ready workflow report.

${sharedInstructions(workflow)}
`;
}

function buildOpenAiInstructions(workflow) {
  return `
# ${workflow.name} - OpenAI Workflow Instructions

Paste this into the OpenAI workflow or orchestrator instruction field for this workflow. Configure the listed tools/connectors separately in the orchestrator.

## Role

You are the OpenAI workflow orchestrator running the ${workflow.name} workflow for a revenue team. Your job is to coordinate tool calls, keep side effects on native connectors, and produce the final workflow report in the requested delivery format.

${sharedInstructions(workflow)}
`;
}

function removeRetiredCodeEntrypoints(workflowDir) {
  let removed = 0;
  for (const entry of fs.readdirSync(workflowDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (/^(claude_agent|openai_agent|langgraph)_.+\.py$/.test(entry.name)) {
      fs.rmSync(path.join(workflowDir, entry.name));
      removed += 1;
    }
  }
  return removed;
}

export function buildOrchestratorInstructions() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  let updatedWorkflows = 0;
  let removedCodeEntrypoints = 0;

  for (const workflow of catalog.workflows || []) {
    const workflowDir = path.join(repoRoot, workflow.id);
    if (!fs.existsSync(workflowDir)) continue;

    removedCodeEntrypoints += removeRetiredCodeEntrypoints(workflowDir);
    writeText(path.join(workflowDir, 'claude-workflow-instructions.md'), buildClaudeInstructions(workflow));
    writeText(path.join(workflowDir, 'openai-workflow-instructions.md'), buildOpenAiInstructions(workflow));

    workflow.platforms = workflow.platforms || {};
    delete workflow.platforms.langgraph;
    delete workflow.platforms['claude-agent'];
    delete workflow.platforms['openai-agent'];
    workflow.platforms['claude-workflow'] = 'claude-workflow-instructions.md';
    workflow.platforms['openai-workflow'] = 'openai-workflow-instructions.md';

    updatedWorkflows += 1;
  }

  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

  return {
    updatedWorkflows,
    removedCodeEntrypoints,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(buildOrchestratorInstructions(), null, 2));
}
