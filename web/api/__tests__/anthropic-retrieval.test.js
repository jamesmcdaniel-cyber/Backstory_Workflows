import { describe, it, expect, vi } from 'vitest';

// Force retrieval to throw so we exercise runAssistant's fail-open path: the
// chat must still produce a reply, with no retrieved block in the prompt.
vi.mock('../_retrieval.js', () => ({
  selectChunks: vi.fn(() => {
    throw new Error('boom');
  }),
  retrievalQuery: vi.fn(() => 'q'),
}));

import { runAssistant } from '../_anthropic.js';

function fakeClient() {
  const parse = vi.fn(async () => ({
    parsed_output: {
      reply: 'ok',
      recommendations: [],
      proposingDraft: false,
      draft: null,
      buildsArtifact: false,
      artifact: null,
    },
  }));
  return { client: { messages: { parse } }, parse };
}

describe('runAssistant retrieval fail-open', () => {
  it('still replies when retrieval throws, and omits the retrieved block', async () => {
    const { client, parse } = fakeClient();
    const res = await runAssistant({
      surface: 'platform',
      messages: [{ role: 'user', content: 'anything at all' }],
      client,
    });
    expect(res.reply).toBe('ok');
    const sysText = parse.mock.calls[0][0].system.map((b) => b.text).join('\n');
    expect(sysText).not.toContain('Relevant library detail');
  });
});
