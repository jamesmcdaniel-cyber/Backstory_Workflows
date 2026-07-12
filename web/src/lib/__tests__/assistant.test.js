import { describe, it, expect } from 'vitest';
import { appendUser, appendAssistant, toApiMessages, attachmentKind, attachmentsForRequest, buildPrompt, artifactPrompt } from '../assistant.js';

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
    const p = buildPrompt({ target: 'workflow', platform: 'n8n', goal: 'alert on stuck deals', trigger: 'hourly', output: 'Slack', formatExample: 'Risk: high', formatExamples: ['sample.pdf'] });
    expect(p).toContain('Plan a custom workflow for n8n');
    expect(p).toContain('alert on stuck deals');
    expect(p).toContain('Trigger: hourly');
    expect(p).toContain('Output / delivery: Slack');
    expect(p).toContain('Desired output format example:\nRisk: high');
    expect(p).toContain('Attached format examples: sample.pdf');
    expect(p).toContain('without copying sensitive or customer-specific values');
    expect(p).toContain('Do not generate the artifact yet');
  });
  it('omits empty optional fields', () => {
    const p = buildPrompt({ target: 'skill', platform: 'Claude', goal: 'summarize an account' });
    expect(p).toContain('Plan a custom skill for Claude');
    expect(p).not.toContain('Trigger:');
    expect(p).not.toContain('Output / delivery:');
  });
  it('does not silently choose n8n', () => {
    const p = buildPrompt({ target: 'workflow', platform: 'Help me choose', goal: 'send an alert' });
    expect(p).not.toContain('for n8n');
    expect(p).toContain('Recommend the best target platform');
  });
  it('creates a separate confirmed artifact request', () => {
    const p = artifactPrompt({ title: 'Alert', stack: 'Workato', spec: 'trigger → notify' });
    expect(p).toContain('confirmed workflow artifact');
    expect(p).toContain('Workato');
  });
});

describe('attachmentsForRequest', () => {
  const composer = [{ name: 'composer.txt' }];
  const build = [{ name: 'format.pdf' }];

  it('reattaches build examples during artifact generation', () => {
    expect(attachmentsForRequest({ requestMode: 'artifact', composerAttachments: composer, buildAttachments: build })).toBe(build);
  });

  it('honors explicit attachments and uses composer files for ordinary chat', () => {
    const explicit = [{ name: 'explicit.csv' }];
    expect(attachmentsForRequest({ requestMode: 'artifact', explicitAttachments: explicit, composerAttachments: composer, buildAttachments: build })).toBe(explicit);
    expect(attachmentsForRequest({ requestMode: 'chat', composerAttachments: composer, buildAttachments: build })).toBe(composer);
  });
});
