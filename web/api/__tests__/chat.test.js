import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../_anthropic.js', () => ({
  runAssistant: vi.fn(),
}));
import { runAssistant } from '../_anthropic.js';
import handler from '../chat.js';

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ANTHROPIC_API_KEY;
});

describe('/api/chat handler', () => {
  it('405s on non-POST', async () => {
    const res = mockRes();
    await handler({ method: 'GET' }, res);
    expect(res.statusCode).toBe(405);
  });

  it('400s on a bad surface', async () => {
    const res = mockRes();
    await handler({ method: 'POST', body: { surface: 'nope', messages: [] } }, res);
    expect(res.statusCode).toBe(400);
  });

  it('returns an offline reply when no key is set (200, no crash)', async () => {
    const res = mockRes();
    await handler({ method: 'POST', body: { surface: 'workflows', messages: [{ role: 'user', content: 'hi' }] } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.reply).toMatch(/offline/i);
    expect(runAssistant).not.toHaveBeenCalled();
  });

  it('calls runAssistant and returns its result when a key is set', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    runAssistant.mockResolvedValue({ reply: 'ok', recommendations: ['01-x'], proposingDraft: false, draft: null });
    const res = mockRes();
    await handler({ method: 'POST', body: { surface: 'skills', messages: [{ role: 'user', content: 'hi' }], persona: 'AE' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.recommendations).toEqual(['01-x']);
    expect(runAssistant).toHaveBeenCalledWith({ surface: 'skills', messages: [{ role: 'user', content: 'hi' }], persona: 'AE' });
  });
});
