import { describe, it, expect, vi } from 'vitest';
import { buildSystemPrompt, normalizeReply, runAssistant, buildMessages } from '../_anthropic.js';

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
  it('injects page context when provided', () => {
    const p = buildSystemPrompt('workflows', 'AE', 'The user is on the workflow detail page for "01-sales-digest".');
    expect(p).toContain('Page context:');
    expect(p).toContain('01-sales-digest');
  });
  it('platform surface returns the librarian prompt with both catalogues and strategy', () => {
    const p = buildSystemPrompt('platform');
    expect(p).toContain('Librarian');
    expect(p.toLowerCase()).toContain('strategy');
    // ids from both generated catalogues appear
    expect(p).toMatch(/\d{2}-[a-z-]+/); // a workflow id
    expect(p).toContain('Signals catalogue');
    expect(p.toLowerCase()).toContain('when a question is vague');
    expect(p).toContain('60–100 words');
  });
  it('appends the retrieved block for any surface when provided', () => {
    const block = 'Relevant library detail:\n### Setup guide: Slack\nCreate a Slack app…';
    expect(buildSystemPrompt('platform', null, null, block)).toContain('### Setup guide: Slack');
    expect(buildSystemPrompt('workflows', null, null, block)).toContain('### Setup guide: Slack');
  });
  it('keeps artifact-only n8n instructions out of ordinary chat', () => {
    expect(buildSystemPrompt('platform')).not.toContain('Trigger Webhook');
    expect(buildSystemPrompt('platform', null, null, '', 'artifact')).toContain('Trigger Webhook');
  });
  it('defines truthful formats for every build platform', () => {
    const prompt = buildSystemPrompt('platform', null, null, '', 'artifact');
    expect(prompt).toContain('Workato-exported package .zip');
    expect(prompt).toContain('Zapier does not accept this as reusable workflow JSON');
    expect(prompt).toContain('-claude-workflow-instructions.md');
    expect(prompt).toContain('-openai-workflow-instructions.md');
  });
});

describe('normalizeReply', () => {
  it('drops the draft when not proposing one', () => {
    const r = normalizeReply({ intent: 'find', reply: 'hi', recommendations: ['01-sales-digest'], proposingDraft: false, draft: { title: 't' } }, 'platform');
    expect(r.draft).toBeNull();
    expect(r.recommendations).toEqual(['01-sales-digest']);
  });
  it('removes recommendations from non-find answers and filters unknown ids', () => {
    const explained = normalizeReply({ intent: 'explain', reply: 'hi', recommendations: ['01-sales-digest'], proposingDraft: false }, 'platform');
    expect(explained.recommendations).toEqual([]);
    const found = normalizeReply({ intent: 'find', reply: 'hi', recommendations: ['missing', '01-sales-digest', '01-sales-digest'], proposingDraft: false }, 'platform');
    expect(found.recommendations).toEqual(['01-sales-digest']);
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
    expect(r.artifact).toBeNull();
  });
  it('keeps the artifact when building one', () => {
    const r = normalizeReply({
      reply: 'built it',
      recommendations: [],
      proposingDraft: false,
      draft: { title: '', summary: '', stack: '', spec: '' },
      buildsArtifact: true,
      artifact: { platform: 'n8n', filename: 'x.json', language: 'json', content: '{"nodes":[]}' },
    });
    expect(r.buildsArtifact).toBe(true);
    expect(r.artifact.filename).toBe('x.json');
  });
  it('drops the artifact when not building', () => {
    const r = normalizeReply({ reply: 'hi', recommendations: [], proposingDraft: false, draft: {}, buildsArtifact: false, artifact: { content: 'x' } });
    expect(r.artifact).toBeNull();
  });
});

describe('buildMessages', () => {
  it('returns plain text messages when there are no attachments', () => {
    const msgs = buildMessages([{ role: 'user', content: 'hi' }], undefined);
    expect(msgs).toEqual([{ role: 'user', content: 'hi' }]);
  });
  it('attaches image/document/text blocks to the last user message', () => {
    const msgs = buildMessages(
      [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'ok' },
        { role: 'user', content: 'use these' },
      ],
      [
        { name: 'shot.png', mediaType: 'image/png', kind: 'image', data: 'AAAA' },
        { name: 'export.json', mediaType: 'application/json', kind: 'text', data: '{"a":1}' },
        { name: 'guide.pdf', mediaType: 'application/pdf', kind: 'document', data: 'BBBB' },
      ],
    );
    const last = msgs[2].content;
    expect(Array.isArray(last)).toBe(true);
    expect(last[0]).toEqual({ type: 'text', text: 'use these' });
    expect(last[1]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } });
    expect(last[2].type).toBe('text');
    expect(last[2].text).toContain('export.json');
    expect(last[3]).toEqual({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'BBBB' } });
    // earlier turns are untouched
    expect(msgs[0]).toEqual({ role: 'user', content: 'first' });
  });
});

describe('runAssistant', () => {
  it('passes the system prompt + messages to the injected client and normalizes the result', async () => {
    const parse = vi.fn().mockResolvedValue({
      parsed_output: { intent: 'find', reply: 'Try 01-sales-digest', recommendations: ['01-sales-digest'], proposingDraft: false, draft: { title: '', summary: '', stack: '', spec: '' } },
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
  it('uses a smaller budget for chat and reserves the large budget for artifacts', async () => {
    const parse = vi.fn().mockResolvedValue({ parsed_output: { intent: 'explain', reply: 'ok', recommendations: [], proposingDraft: false } });
    const client = { messages: { parse } };
    await runAssistant({ surface: 'platform', messages: [{ role: 'user', content: 'what is MCP?' }], client });
    expect(parse.mock.calls[0][0].max_tokens).toBe(900);
    await runAssistant({ surface: 'platform', messages: [{ role: 'user', content: 'generate it' }], requestMode: 'artifact', client });
    expect(parse.mock.calls[1][0].max_tokens).toBe(8192);
    expect(parse.mock.calls[1][0].system).toContain('confirmed artifact-generation request');
  });
});
