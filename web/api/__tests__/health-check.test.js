import { describe, expect, it, vi } from 'vitest';
import handler, { verifyArtifactWithRunner } from '../health-check.js';

const workflow = {
  name: 'Verified Deal Alert', active: false, settings: {},
  nodes: [
    { id: '1', name: 'Trigger Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], parameters: { path: 'verify-deal', httpMethod: 'POST' } },
    { id: '2', name: 'Backstory MCP Context', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [200, 0], parameters: { url: '={{$env.BACKSTORY_URL}}' } },
    { id: '3', name: 'AI LLM Synthesis', type: 'n8n-nodes-base.code', typeVersion: 2, position: [400, 0], parameters: { jsCode: 'return items;' } },
    { id: '4', name: 'Slack Delivery', type: 'n8n-nodes-base.slack', typeVersion: 2, position: [600, 0], parameters: { channelId: '={{$env.CHANNEL}}', text: '={{$json.alert}}' }, credentials: { slackOAuth2Api: { id: 'configure', name: 'Slack' } } },
  ],
  connections: {
    'Trigger Webhook': { main: [[{ node: 'Backstory MCP Context', type: 'main', index: 0 }]] },
    'Backstory MCP Context': { main: [[{ node: 'AI LLM Synthesis', type: 'main', index: 0 }]] },
    'AI LLM Synthesis': { main: [[{ node: 'Slack Delivery', type: 'main', index: 0 }]] },
  },
};

const validArtifact = {
  platform: 'n8n', filename: 'verified-deal.json', language: 'json', content: JSON.stringify(workflow),
  testPlan: {
    sampleInput: 'A fictional stalled opportunity assigned to a test owner.',
    expectedOutcome: 'One alert is created in the isolated test destination.',
    steps: ['Import into an isolated n8n project.', 'Run the fixture and inspect the Slack test payload.'],
  },
};

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('/api/health-check', () => {
  it('rejects invalid requests and methods', async () => {
    const get = mockRes();
    await handler({ method: 'GET' }, get);
    expect(get.statusCode).toBe(405);
    const bad = mockRes();
    await handler({ method: 'POST', body: {} }, bad);
    expect(bad.statusCode).toBe(400);
  });

  it('returns a failed health result for an unusable artifact', async () => {
    const res = mockRes();
    await handler({ method: 'POST', body: { artifact: { platform: 'n8n', filename: 'bad.json', language: 'json', content: '{'.repeat(301) } } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.status).toBe('failed');
  });

  it('keeps download locked when static preflight passes but no execution runner is configured', async () => {
    const result = await verifyArtifactWithRunner(validArtifact, { env: {}, fetchImpl: vi.fn() });
    expect(result.preflightValid).toBe(true);
    expect(result.verified).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.status).toBe('verification_required');
  });

  it('accepts only a runner receipt bound to the artifact hash and representative test', async () => {
    const fetchImpl = vi.fn(async (_url, options) => {
      const payload = JSON.parse(options.body);
      return {
        ok: true,
        async json() {
          return {
            verified: true,
            testPlanPassed: true,
            receipt: 'runner-receipt-123',
            artifactHash: payload.artifactHash,
            platform: 'n8n',
            executedAt: '2026-07-11T18:00:00.000Z',
            summary: 'Imported and executed the representative fixture.',
          };
        },
      };
    });
    const result = await verifyArtifactWithRunner(validArtifact, { env: { WORKFLOW_VERIFIER_URL: 'https://runner.example.test' }, fetchImpl });
    expect(result.valid).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.verification.receipt).toBe('runner-receipt-123');
    expect(result.checks.at(-1)).toMatchObject({ name: 'Sandbox execution', passed: true });
  });
});
