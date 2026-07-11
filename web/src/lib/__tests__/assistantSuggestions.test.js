import { describe, expect, it } from 'vitest';
import { HOME_SUGGESTIONS, assistantContextForPath } from '../assistantSuggestions';

const ROUTES = [
  '/signals/example',
  '/signals',
  '/mcp',
  '/workflow/example',
  '/flows',
  '/api-docs',
  '/guides',
  '/about',
  '/library',
];

describe('assistant starter prompt wording', () => {
  it('uses complete, user-voiced questions on every surface', () => {
    const suggestions = [
      ...HOME_SUGGESTIONS,
      ...ROUTES.flatMap((route) => assistantContextForPath(route).suggestions),
    ];

    for (const suggestion of suggestions) {
      expect(suggestion).toMatch(/^(?:How|What|Which)\b/);
      expect(suggestion).toMatch(/\?$/);
      expect(suggestion).not.toMatch(/^(?:Build|Find|Plan|Set up|Talk through|Understand)\b/);
    }
  });

  it('keeps home prompts specific to the user outcome', () => {
    expect(HOME_SUGGESTIONS).toEqual([
      'How can Backstory improve deal discovery?',
      'What can I do with Backstory MCP?',
      'How can I build an alert for at-risk deals?',
      'How should I plan my automation roadmap?',
      'How do I connect Slack?',
    ]);
  });
});
