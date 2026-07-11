import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../events.js';

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

beforeEach(() => {
  delete process.env.ANALYTICS_WEBHOOK_URL;
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

describe('/api/events', () => {
  it('accepts allowlisted metadata-only events', async () => {
    const res = mockRes();
    await handler({ method: 'POST', body: { name: 'assistant_response', properties: { intent: 'find', latencyMs: 42, nested: { prompt: 'secret' } } } }, res);
    expect(res.statusCode).toBe(202);
    const logged = JSON.parse(console.info.mock.calls[0][0]);
    expect(logged.properties).toEqual({ intent: 'find', latencyMs: 42 });
  });

  it('rejects unknown event names and methods', async () => {
    const invalid = mockRes();
    await handler({ method: 'POST', body: { name: 'prompt_text', properties: {} } }, invalid);
    expect(invalid.statusCode).toBe(400);
    const get = mockRes();
    await handler({ method: 'GET' }, get);
    expect(get.statusCode).toBe(405);
  });
});
