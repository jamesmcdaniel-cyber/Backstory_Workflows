import { describe, it, expect, vi } from 'vitest';
import { buildSystemPrompt, normalizeReply, runAssistant } from '../_anthropic.js';

describe('buildSystemPrompt', () => {
  it('includes the surface noun and the catalogue index', () => {
    const p = buildSystemPrompt('workflows', 'RevOps');
    expect(p).toContain('workflow');
    expect(p).toContain('RevOps');
    // an id from the generated index should appear in the inlined catalogue
    expect(p).toMatch(/\d{2}-[a-z-]+/);
  });
  it('handles a missing persona', () => {
    const p = buildSystemPrompt('skills');
    expect(p).toContain('skill');
    expect(p.toLowerCase()).toContain("don't know");
  });
});

describe('normalizeReply', () => {
  it('drops the draft when not proposing one', () => {
    const r = normalizeReply({ reply: 'hi', recommendations: ['01-x'], proposingDraft: false, draft: { title: 't' } });
    expect(r.draft).toBeNull();
    expect(r.recommendations).toEqual(['01-x']);
  });
  it('keeps the draft when proposing', () => {
    const r = normalizeReply({ reply: 'hi', recommendations: [], proposingDraft: true, draft: { title: 't', summary: 's', stack: 'n8n', spec: 'x' } });
    expect(r.proposingDraft).toBe(true);
    expect(r.draft.title).toBe('t');
  });
  it('is safe on garbage input', () => {
    const r = normalizeReply(null);
    expect(r.reply).toMatch(/./);
    expect(r.recommendations).toEqual([]);
    expect(r.draft).toBeNull();
  });
});

describe('runAssistant', () => {
  it('passes the system prompt + messages to the injected client and normalizes the result', async () => {
    const parse = vi.fn().mockResolvedValue({
      parsed_output: { reply: 'Try 01-sales-digest', recommendations: ['01-sales-digest'], proposingDraft: false, draft: { title: '', summary: '', stack: '', spec: '' } },
    });
    const client = { messages: { parse } };
    const result = await runAssistant({
      surface: 'workflows',
      messages: [{ role: 'user', content: 'daily summary of my deals' }],
      persona: 'AE',
      client,
    });
    expect(parse).toHaveBeenCalledOnce();
    const arg = parse.mock.calls[0][0];
    expect(arg.system).toContain('workflow');
    expect(arg.messages[0].content).toContain('daily summary');
    expect(result.recommendations).toEqual(['01-sales-digest']);
    expect(result.draft).toBeNull();
  });
});
