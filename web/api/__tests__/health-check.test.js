import { describe, expect, it } from 'vitest';
import handler from '../health-check.js';

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
});
