import { describe, it, expect, vi } from 'vitest';
import { normalizeTriage, runTriage, buildTriagePrompt } from '../_triage.js';

describe('buildTriagePrompt', () => {
  it('returns a non-empty system prompt string', () => {
    const prompt = buildTriagePrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain('isMine');
    expect(prompt).toContain('suggestedPlatform');
  });
});

describe('normalizeTriage', () => {
  it('returns empty candidates on null input', () => {
    expect(normalizeTriage(null)).toEqual({ candidates: [] });
  });

  it('returns empty candidates on non-object input', () => {
    expect(normalizeTriage('garbage')).toEqual({ candidates: [] });
    expect(normalizeTriage(42)).toEqual({ candidates: [] });
  });

  it('returns empty candidates when candidates is missing', () => {
    expect(normalizeTriage({})).toEqual({ candidates: [] });
  });

  it('returns empty candidates when candidates is not an array', () => {
    expect(normalizeTriage({ candidates: 'bad' })).toEqual({ candidates: [] });
  });

  it('preserves a valid candidate', () => {
    const input = {
      candidates: [
        {
          title: 'Weekly Deal Digest',
          request: 'Send a weekly digest of closed deals to the sales team',
          customer: 'Sales team',
          assignee: 'me',
          isMine: true,
          trigger: 'every Monday 9 AM',
          outputs: 'Slack message',
          suggestedPlatform: 'n8n',
          confidence: 'high',
        },
      ],
    };
    const result = normalizeTriage(input);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].title).toBe('Weekly Deal Digest');
    expect(result.candidates[0].isMine).toBe(true);
    expect(result.candidates[0].confidence).toBe('high');
  });

  it('filters out candidates without title or request', () => {
    const input = {
      candidates: [
        { title: 'Good one', request: 'Do something', isMine: true, confidence: 'high' },
        { title: '', request: 'missing title', isMine: false, confidence: 'low' },
        { isMine: false, confidence: 'medium' }, // no title or request
        null,
      ],
    };
    const result = normalizeTriage(input);
    // Only the first one has both title (non-undefined) and request as strings
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0].title).toBe('Good one');
  });
});

describe('runTriage', () => {
  it('calls parse once with the notes in the user message and returns normalized candidates', async () => {
    const mockCandidate = {
      title: 'Onboarding Status Report',
      request: 'Automate weekly onboarding status reports for new customers',
      customer: 'CS team',
      assignee: 'me',
      isMine: true,
      trigger: 'every Friday',
      outputs: 'email',
      suggestedPlatform: 'Zapier',
      confidence: 'medium',
    };
    const parse = vi.fn().mockResolvedValue({
      parsed_output: { candidates: [mockCandidate] },
    });
    const client = { messages: { parse } };

    const result = await runTriage({ notes: 'We need to automate weekly onboarding status reports.', client });

    expect(parse).toHaveBeenCalledOnce();
    const arg = parse.mock.calls[0][0];
    expect(arg.messages[0].role).toBe('user');
    expect(arg.messages[0].content).toContain('Meeting notes:');
    expect(arg.messages[0].content).toContain('automate weekly onboarding status reports');
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].title).toBe('Onboarding Status Report');
  });

  it('returns empty candidates when parse returns garbage', async () => {
    const parse = vi.fn().mockResolvedValue({ parsed_output: null });
    const client = { messages: { parse } };

    const result = await runTriage({ notes: 'Discussed Q3 goals.', client });
    expect(result).toEqual({ candidates: [] });
  });
});
