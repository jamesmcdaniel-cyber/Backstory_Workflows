import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AssistantMessage, restoreLegacyListBreaks } from '../../components/assistant/AssistantMessage';
import { ResponseModeControl } from '../../components/assistant/ResponseModeControl';

describe('assistant response presentation', () => {
  it('renders Markdown as semantic, readable content', () => {
    const html = renderToStaticMarkup(createElement(AssistantMessage, {
      content: '## Setup\n\n1. **Create the app**\n2. Add `chat:write`\n\n- Test it',
    }));
    expect(html).toContain('<h2');
    expect(html).toContain('<ol');
    expect(html).toContain('<strong');
    expect(html).toContain('<code');
    expect(html).not.toContain('**Create the app**');
  });

  it('restores numbered list breaks in older compact replies', () => {
    expect(restoreLegacyListBreaks('Intro. **1. First** — do this. **2. Second** — do that.'))
      .toBe('Intro.\n\n1. **First** — do this.\n\n2. **Second** — do that.');
  });

  it('labels response detail and keeps all choices in an equal grid', () => {
    const html = renderToStaticMarkup(createElement(ResponseModeControl, { value: 'guided', onChange: () => {} }));
    expect(html).toContain('Response detail');
    expect(html).toContain('Answer plus next decision');
    expect(html).toContain('grid-cols-3');
    expect((html.match(/aria-pressed=/g) || [])).toHaveLength(3);
  });
});
