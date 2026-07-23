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
      'Which template generates meeting briefs?',
      'What can I do with Backstory MCP?',
      'Which skills turn account plans into actionable insights?',
    ]);
  });

  it('keeps home prompts to a single row of three', () => {
    expect(HOME_SUGGESTIONS).toHaveLength(3);
  });
});
