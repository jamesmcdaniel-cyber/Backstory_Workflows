import { describe, it, expect } from 'vitest';
import { appendUser, appendAssistant, toApiMessages } from '../assistant.js';

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
