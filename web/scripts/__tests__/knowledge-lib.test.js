import { describe, it, expect } from 'vitest';
import { truncate, workflowChunks, signalChunks, mcpChunks, conceptChunks } from '../knowledge-lib.mjs';

const WF = [{
  id: '03-silence-contract-monitor',
  name: 'Silence & Contract Monitor',
  category: 'account-monitoring',
  description: 'Monitors accounts for engagement gaps that may signal churn risk.',
  trigger: 'Every morning at 6:30 AM',
  output: 'Slack alert per flagged account',
  node_flow: ['cron', 'fetch accounts', 'LLM assessment', 'Slack'],
  platforms: { n8n: '03-silence.json', workato: '03-silence-workato.json' },
}];

const SK = [{
  id: 'account-planning',
  name: 'Account Planning',
  category: 'planning',
  description: 'Builds an account plan from live Backstory data.',
  audience: 'AEs',
  input: 'An account name',
  mcpTools: ['find_account', 'ask_sales_ai_about_account'],
  walkthrough: 'Ask for a plan, the signal pulls engagement and news.',
}];

const MCP = [
  { name: 'find_account', description: 'Look up an account by name.', usedBy: ['Account Planning'] },
  { name: 'get_company_news', description: 'Recent news for a company.', usedBy: [] },
];

describe('truncate', () => {
  it('collapses whitespace and caps length with an ellipsis', () => {
    expect(truncate('a  b\n\nc', 100)).toBe('a b c');
    const long = 'x'.repeat(300);
    expect(truncate(long, 100)).toHaveLength(100);
    expect(truncate(long, 100).endsWith('…')).toBe(true);
  });
  it('is safe on null/undefined', () => {
    expect(truncate(null, 10)).toBe('');
  });
});

describe('workflowChunks', () => {
  it('builds one chunk per workflow with full detail', () => {
    const [c] = workflowChunks(WF);
    expect(c.id).toBe('workflow:03-silence-contract-monitor');
    expect(c.type).toBe('workflow');
    expect(c.title).toContain('Silence & Contract Monitor');
    expect(c.text).toContain('churn risk');
    expect(c.text).toContain('Trigger: Every morning at 6:30 AM');
    expect(c.text).toContain('Platforms: n8n, workato');
    expect(c.keywords).toContain('account-monitoring');
  });
  it('is safe on empty input', () => {
    expect(workflowChunks([])).toEqual([]);
    expect(workflowChunks(undefined)).toEqual([]);
  });
});

describe('signalChunks', () => {
  it('builds one chunk per signal including MCP tools used', () => {
    const [c] = signalChunks(SK);
    expect(c.id).toBe('signal:account-planning');
    expect(c.type).toBe('signal');
    expect(c.text).toContain('MCP tools used: find_account, ask_sales_ai_about_account');
    expect(c.keywords).toContain('signal');
  });
});

describe('mcpChunks', () => {
  it('builds an overview chunk plus one per tool', () => {
    const chunks = mcpChunks(MCP);
    expect(chunks).toHaveLength(3);
    expect(chunks[0].id).toBe('mcp:overview');
    expect(chunks[0].text).toContain('find_account');
    const tool = chunks.find((c) => c.id === 'mcp:find_account');
    expect(tool.text).toContain('Used by: Account Planning');
  });
});

describe('conceptChunks', () => {
  it('explains workflows, signals, and the MCP', () => {
    const chunks = conceptChunks();
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    const all = chunks.map((c) => c.text).join(' ');
    expect(all).toMatch(/workflow/i);
    expect(all).toMatch(/signal/i);
    expect(all).toMatch(/MCP/);
  });
});
