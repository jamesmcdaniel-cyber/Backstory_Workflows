import { describe, it, expect } from 'vitest';
import { tokenize, scoreChunk, selectChunks, retrievalQuery } from '../_retrieval.js';

const CHUNKS = [
  {
    id: 'guide:guide-slack-view', type: 'guide', title: 'Setup guide: Slack Bot Setup Guide',
    keywords: ['slack', 'setup', 'guide'],
    text: 'Create a Slack app, add the bot token scopes chat:write, then install the app to your workspace and copy the bot token into the workflow credential.',
  },
  {
    id: 'workflow:16-executive-sponsor-tracker', type: 'workflow', title: 'Executive Sponsor Tracker (Auto flow)',
    keywords: ['16-executive-sponsor-tracker', 'account-monitoring', 'workflow'],
    text: 'Tracks executive sponsor engagement on strategic accounts and alerts the account team when sponsor activity drops.',
  },
  {
    id: 'api:accounts', type: 'api', title: 'API endpoints: Accounts',
    keywords: ['accounts', 'api', 'endpoint', 'rest'],
    text: 'GET /v0/public/accounts — List accounts\nGET /v0/public/accounts/{id} — Get one account',
  },
];

describe('tokenize', () => {
  it('lowercases, splits on non-alphanumerics, drops stopwords and single chars', () => {
    expect(tokenize('How do I set up the Slack bot?')).toEqual(['set', 'slack', 'bot']);
    expect(tokenize('')).toEqual([]);
    expect(tokenize(null)).toEqual([]);
  });
});

describe('scoreChunk', () => {
  it('weights title/keyword hits above body hits', () => {
    const q = tokenize('slack setup');
    const slack = scoreChunk(q, CHUNKS[0]);
    const other = scoreChunk(q, CHUNKS[1]);
    expect(slack).toBeGreaterThan(other);
  });
  it('returns 0 for an empty query', () => {
    expect(scoreChunk([], CHUNKS[0])).toBe(0);
  });
});

describe('selectChunks', () => {
  it('ranks the on-topic chunk first', () => {
    const picked = selectChunks('how do I set up the slack bot', CHUNKS);
    expect(picked[0].id).toBe('guide:guide-slack-view');
  });
  it('filters out irrelevant chunks via minScore', () => {
    const picked = selectChunks('quarterly cheesecake recipes', CHUNKS);
    expect(picked).toEqual([]);
  });
  it('respects k', () => {
    const picked = selectChunks('accounts api slack workflow sponsor', CHUNKS, { k: 1, minScore: 0.1 });
    expect(picked).toHaveLength(1);
  });
  it('respects the char budget', () => {
    const picked = selectChunks('slack', CHUNKS, { maxChars: 10 });
    expect(picked).toEqual([]); // first chunk alone exceeds the budget
  });
  it('is safe on empty inputs', () => {
    expect(selectChunks('', CHUNKS)).toEqual([]);
    expect(selectChunks('slack', [])).toEqual([]);
    expect(selectChunks('slack', undefined)).toEqual([]);
  });
});

describe('retrievalQuery', () => {
  it('uses the latest user message', () => {
    const q = retrievalQuery([
      { role: 'user', content: 'find me a renewal risk workflow' },
      { role: 'assistant', content: 'sure' },
    ]);
    expect(q).toBe('find me a renewal risk workflow');
  });
  it('prepends the previous user message when the latest is very short', () => {
    const q = retrievalQuery([
      { role: 'user', content: 'tell me about the slack setup guide' },
      { role: 'assistant', content: 'it explains bot tokens' },
      { role: 'user', content: 'how?' },
    ]);
    expect(q).toContain('slack setup guide');
    expect(q).toContain('how?');
  });
  it('is safe on empty input', () => {
    expect(retrievalQuery([])).toBe('');
    expect(retrievalQuery(undefined)).toBe('');
  });
});
