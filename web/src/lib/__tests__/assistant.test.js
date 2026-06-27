import { describe, it, expect } from 'vitest';
import { appendUser, appendAssistant, toApiMessages, attachmentKind, buildPrompt } from '../assistant.js';

describe('assistant message helpers', () => {
  it('appendUser adds a user turn', () => {
    const turns = appendUser([], 'find a renewal workflow');
    expect(turns).toEqual([{ role: 'user', content: 'find a renewal workflow' }]);
  });

  it('appendAssistant attaches reply, recommendations, and draft only when proposing', () => {
    const a = appendAssistant([], { reply: 'here', recommendations: ['16-renewal'], proposingDraft: false, draft: { title: 'x' } });
    expect(a[0]).toMatchObject({ role: 'assistant', content: 'here', recommendations: ['16-renewal'], draft: null });

    const b = appendAssistant([], { reply: 'build this', recommendations: [], proposingDraft: true, draft: { title: 'New', summary: 's', stack: 'n8n', spec: 'x' } });
    expect(b[0].draft.title).toBe('New');
  });

  it('toApiMessages strips UI-only fields', () => {
    const turns = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hey', recommendations: ['01-x'], draft: null },
    ];
    expect(toApiMessages(turns)).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hey' },
    ]);
  });
});

describe('attachmentKind', () => {
  it('classifies images, pdfs, and text', () => {
    expect(attachmentKind('image/png')).toBe('image');
    expect(attachmentKind('image/jpeg')).toBe('image');
    expect(attachmentKind('application/pdf')).toBe('document');
    expect(attachmentKind('application/json')).toBe('text');
    expect(attachmentKind('text/plain')).toBe('text');
    expect(attachmentKind('')).toBe('text');
  });
});

describe('buildPrompt', () => {
  it('assembles a build request with platform and provided fields', () => {
    const p = buildPrompt({ target: 'workflow', platform: 'n8n', goal: 'alert on stuck deals', trigger: 'hourly', output: 'Slack' });
    expect(p).toContain('Build a custom workflow for n8n');
    expect(p).toContain('alert on stuck deals');
    expect(p).toContain('Trigger: hourly');
    expect(p).toContain('Output / delivery: Slack');
    expect(p).toContain('build artifact');
  });
  it('omits empty optional fields', () => {
    const p = buildPrompt({ target: 'skill', platform: 'Claude', goal: 'summarize an account' });
    expect(p).toContain('Build a custom skill for Claude');
    expect(p).not.toContain('Trigger:');
    expect(p).not.toContain('Output / delivery:');
  });
});
