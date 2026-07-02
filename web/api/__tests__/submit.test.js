import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler, { renderIssueBody } from '../submit.js';

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

const draft = { title: 'Slack deal alert', summary: 'Pings on stuck deals', stack: 'MCP + Slack', spec: 'trigger → score → notify' };

beforeEach(() => {
  vi.restoreAllMocks();
  delete process.env.GITHUB_TOKEN;
  process.env.GITHUB_REPO = 'owner/repo';
});

describe('renderIssueBody', () => {
  it('includes summary, stack, and spec', () => {
    const body = renderIssueBody({ surface: 'workflows', draft, persona: 'AE' });
    expect(body).toContain('Pings on stuck deals');
    expect(body).toContain('MCP + Slack');
    expect(body).toContain('trigger → score → notify');
    expect(body).toContain('AE');
  });
});

describe('/api/submit handler', () => {
  it('400s on a draft with no title', async () => {
    const res = mockRes();
    await handler({ method: 'POST', body: { surface: 'workflows', draft: {} } }, res);
    expect(res.statusCode).toBe(400);
  });

  it('returns a prefilled issue URL when no token is set', async () => {
    const res = mockRes();
    await handler({ method: 'POST', body: { surface: 'workflows', draft } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.fallbackUrl).toContain('github.com/owner/repo/issues/new');
  });

  it('creates an issue via the GitHub API when a token is set', async () => {
    process.env.GITHUB_TOKEN = 'ghp_test';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ html_url: 'https://github.com/owner/repo/issues/42', number: 42 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = mockRes();
    await handler({ method: 'POST', body: { surface: 'skills', draft, persona: 'RevOps' } }, res);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/owner/repo/issues');
    const sent = JSON.parse(opts.body);
    expect(sent.title).toContain('Slack deal alert');
    expect(sent.labels).toContain('marketplace-submission');
    expect(sent.labels).toContain('skill');
    expect(res.body.ok).toBe(true);
    expect(res.body.url).toContain('/issues/42');
  });

  it('accepts the platform surface (no-token fallback URL)', async () => {
    delete process.env.GITHUB_TOKEN;
    const res = mockRes();
    await handler({ method: 'POST', body: { surface: 'platform', draft: { title: 'Renewal radar' } } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.fallbackUrl).toContain('github.com');
  });
});
