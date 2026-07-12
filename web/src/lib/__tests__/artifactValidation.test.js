import { describe, expect, it } from 'vitest';
import { platformDeliverable, platformKey, validateArtifact } from '../artifactValidation.js';

const validWorkflow = {
  name: 'Deal Alert',
  nodes: [
    { id: '1', name: 'Trigger Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], parameters: { path: 'deal-alert', httpMethod: 'POST' } },
    { id: '2', name: 'Backstory MCP Context', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [200, 0], parameters: { url: '={{$env.BACKSTORY_MCP_URL}}' } },
    { id: '3', name: 'AI LLM Synthesis', type: 'n8n-nodes-base.code', typeVersion: 2, position: [400, 0], parameters: { jsCode: 'return items;' } },
    { id: '4', name: 'Slack Delivery', type: 'n8n-nodes-base.slack', typeVersion: 2, position: [600, 0], parameters: { channelId: '={{$env.SLACK_CHANNEL_ID}}', text: '={{$json.alert}}' }, credentials: { slackOAuth2Api: { id: 'configure-me', name: 'Slack account' } } },
  ],
  connections: {
    'Trigger Webhook': { main: [[{ node: 'Backstory MCP Context', type: 'main', index: 0 }]] },
    'Backstory MCP Context': { main: [[{ node: 'AI LLM Synthesis', type: 'main', index: 0 }]] },
    'AI LLM Synthesis': { main: [[{ node: 'Slack Delivery', type: 'main', index: 0 }]] },
  },
  settings: {},
  active: false,
};

const testPlan = {
  sampleInput: 'A fictional open opportunity with no activity for 14 days.',
  expectedOutcome: 'One validated risk alert is prepared for the configured test destination.',
  steps: ['Run with the fictional record in dry-run mode.', 'Verify the risk evidence and delivery payload before activation.'],
};

const workato = `# Deal Alert — Workato Implementation Guide

This file is not an importable JSON artifact. Export real workspace assets as a Workato package .zip.

## Workflow Summary
Build a native alert using Backstory MCP context and safe delivery.

## What To Create In Workato
Create a Backstory custom connector, native Slack connector, and Recipe Functions with secrets in connections.

## Build Order
1. Configure connections and test authentication.
2. Create the Recipe Function and primary recipe.

## Primary Recipe Outline
1. Trigger the recipe, fetch Backstory data, validate structured AI JSON, and deliver it.

## Structured AI Requirements
Return strict JSON, validate required keys, and reject malformed results before delivery.

## Validation Checklist
1. Test representative records, dedupe behavior, retries, permissions, and the final native connector action.
`;

const zapier = `# Deal Alert — Zapier Implementation Guide

Zapier does not accept this guide as an importable JSON workflow.

## Workflow Summary
Create a tested alert using public integrations.

## What To Build In Zapier
Build one primary Zap and a published Backstory public integration.

## Recommended Implementation Shape
1. Trigger with a public integration and map fields into the Backstory action.
2. Validate structured AI JSON before delivery.

## Zaps To Create
1. Create the primary alert Zap with a native Slack action.

## Structured AI Requirements
Validate structured AI output before any delivery action.

## Validation Checklist
1. Test mappings and remember that public templates restrict Code, Webhooks, Paths, Looping, and Formatter steps.
`;

function orchestrator(name) {
  return `# Deal Alert — ${name} Workflow Instructions

## Role
You are the ${name} workflow orchestrator.

## Workflow Context
Run a deal alert from verified account evidence.

## Purpose
Detect stalled deals and deliver a concise alert.

## Required Tools And Connections
Use Backstory MCP and a native Slack connector with secrets held in connections.

## Configurable Inputs
Set the lookback, threshold, and destination.

## Workflow Steps
1. Read the trigger and validate its fields.
2. Call Backstory MCP, synthesize evidence, and deliver the result.

## Tool Use Rules
Do not invent data. Retry transient MCP errors and report missing data.

## Output Requirements
Return the risk, evidence, owner, and next action.

## Validation Checklist
1. Test success, empty data, connector failure, retry exhaustion, and delivery formatting.
`;
}

describe('validateArtifact', () => {
  it('recognizes every supported platform label', () => {
    expect(['n8n', 'Workato recipe', 'Zapier', 'Claude workflow', 'Open AI workflow'].map(platformKey))
      .toEqual(['n8n', 'workato', 'zapier', 'claude', 'openai']);
  });

  it('describes which deliverables are native imports', () => {
    expect(platformDeliverable('n8n')).toMatchObject({ nativeImport: true, suffix: '.json' });
    expect(platformDeliverable('Workato')).toMatchObject({ nativeImport: false, suffix: '-workato-guide.md' });
    expect(platformDeliverable('Zapier').disclosure).toMatch(/not workflow JSON/i);
  });

  it('accepts a complete connected n8n workflow', () => {
    const result = validateArtifact({ platform: 'n8n', filename: 'deal-alert.json', language: 'json', content: JSON.stringify(validWorkflow), testPlan });
    expect(result.valid).toBe(true);
    expect(result.checks.find((check) => check.name === 'Execution path').passed).toBe(true);
  });

  it('blocks malformed, incomplete, disconnected, and active n8n workflows', () => {
    expect(validateArtifact({ platform: 'n8n', filename: 'bad.json', language: 'json', content: '{'.repeat(301) }).valid).toBe(false);
    const broken = { ...validWorkflow, active: true, connections: { 'Trigger Webhook': { main: [[{ node: 'Missing', type: 'main', index: 0 }]] } } };
    const result = validateArtifact({ platform: 'n8n', filename: 'broken.json', language: 'json', content: JSON.stringify(broken), testPlan });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/Connection target|not reachable|inactive/);
  });

  it('rejects invented node types, missing operations, and missing credential references', () => {
    const invented = structuredClone(validWorkflow);
    invented.nodes[2].type = 'n8n-nodes-base.notARealNode';
    expect(validateArtifact({ platform: 'n8n', filename: 'invented.json', language: 'json', content: JSON.stringify(invented), testPlan }).errors.join(' ')).toMatch(/Unsupported n8n node types/);
    const incomplete = structuredClone(validWorkflow);
    incomplete.nodes[3].parameters = {};
    delete incomplete.nodes[3].credentials;
    expect(validateArtifact({ platform: 'n8n', filename: 'incomplete.json', language: 'json', content: JSON.stringify(incomplete), testPlan }).errors.join(' ')).toMatch(/channelId and text|Credential references/);
  });

  it('accepts native Workato and Zapier implementation guides', () => {
    expect(validateArtifact({ platform: 'Workato', filename: 'deal-workato-guide.md', language: 'markdown', content: workato, testPlan }).valid).toBe(true);
    expect(validateArtifact({ platform: 'Zapier', filename: 'deal-zapier-guide.md', language: 'markdown', content: zapier, testPlan }).valid).toBe(true);
  });

  it('rejects fake Workato and Zapier JSON exports', () => {
    const fake = JSON.stringify({ steps: Array(80).fill('fake') });
    expect(validateArtifact({ platform: 'Workato', filename: 'recipe.json', language: 'json', content: fake }).valid).toBe(false);
    expect(validateArtifact({ platform: 'Zapier', filename: 'zap.json', language: 'json', content: fake }).valid).toBe(false);
  });

  it('requires truthful platform-specific filename conventions', () => {
    expect(validateArtifact({ platform: 'Workato', filename: 'generic.md', language: 'markdown', content: workato, testPlan }).valid).toBe(false);
    expect(validateArtifact({ platform: 'Claude', filename: 'generic.md', language: 'markdown', content: orchestrator('Claude'), testPlan }).valid).toBe(false);
  });

  it('accepts complete Claude and OpenAI instruction formats', () => {
    expect(validateArtifact({ platform: 'Claude', filename: 'deal-claude-workflow-instructions.md', language: 'markdown', content: orchestrator('Claude'), testPlan }).valid).toBe(true);
    expect(validateArtifact({ platform: 'OpenAI', filename: 'deal-openai-workflow-instructions.md', language: 'markdown', content: orchestrator('OpenAI'), testPlan }).valid).toBe(true);
  });

  it('blocks hard-coded secrets and reports setup placeholders', () => {
    const secret = { ...validWorkflow, notes: `sk-ant-${'x'.repeat(20)}` };
    expect(validateArtifact({ platform: 'n8n', filename: 'secret.json', language: 'json', content: JSON.stringify(secret), testPlan }).errors).toContain('The artifact appears to contain a hard-coded secret.');
    const placeholder = { ...validWorkflow, notes: 'YOUR_CHANNEL_ID' };
    expect(validateArtifact({ platform: 'n8n', filename: 'setup.json', language: 'json', content: JSON.stringify(placeholder), testPlan }).warnings[0]).toMatch(/target platform/);
    const literal = structuredClone(validWorkflow);
    literal.nodes[1].parameters.apiKey = 'plain-text-credential';
    expect(validateArtifact({ platform: 'n8n', filename: 'literal.json', language: 'json', content: JSON.stringify(literal), testPlan }).errors.join(' ')).toMatch(/literal credentials/);
  });

  it('requires a portable representative test plan', () => {
    const result = validateArtifact({ platform: 'n8n', filename: 'no-test.json', language: 'json', content: JSON.stringify(validWorkflow) });
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/representative sample input/);
  });
});
