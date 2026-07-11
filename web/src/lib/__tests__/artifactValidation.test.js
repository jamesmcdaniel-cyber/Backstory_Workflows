import { describe, expect, it } from 'vitest';
import { validateArtifact } from '../artifactValidation.js';

const validWorkflow = {
  name: 'Test',
  nodes: [
    { id: '1', name: 'Trigger', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
    { id: '2', name: 'Send', type: 'n8n-nodes-base.slack', position: [200, 0], parameters: {} },
  ],
  connections: { Trigger: { main: [[{ node: 'Send', type: 'main', index: 0 }]] } },
  active: false,
};

describe('validateArtifact', () => {
  it('accepts a connected n8n workflow', () => {
    const result = validateArtifact({ platform: 'n8n', filename: 'test.json', language: 'json', content: JSON.stringify(validWorkflow) });
    expect(result.valid).toBe(true);
  });
  it('blocks malformed JSON and missing nodes', () => {
    expect(validateArtifact({ platform: 'n8n', filename: 'bad.json', content: '{' }).valid).toBe(false);
    const result = validateArtifact({ platform: 'n8n', filename: 'empty.json', content: JSON.stringify({ connections: {} }) });
    expect(result.errors).toContain('The workflow has no nodes.');
  });
  it('detects broken connections and placeholders', () => {
    const workflow = { ...validWorkflow, connections: { Trigger: { main: [[{ node: 'Missing', type: 'main', index: 0 }]] } } };
    const result = validateArtifact({ platform: 'n8n', filename: 'test.json', content: `${JSON.stringify(workflow)} TODO` });
    expect(result.valid).toBe(false);
    expect(result.warnings).toContain('Configuration placeholders still need to be replaced.');
  });
});
