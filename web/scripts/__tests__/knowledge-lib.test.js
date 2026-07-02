import { describe, it, expect } from 'vitest';
import {
  truncate,
  workflowChunks,
  signalChunks,
  mcpChunks,
  conceptChunks,
  stripHtml,
  guideChunks,
  apiChunks,
  buildKnowledgeChunks,
} from '../knowledge-lib.mjs';

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

const GUIDE_HTML = `
<div id="guide-slack-view" class="container detail-view">
  <a class="back-link">&#8592; All Guides</a>
  <h2>Slack Bot Setup Guide</h2>
  <p>Create a Slack app at api.slack.com and grab the <b>bot token</b>.</p>
  <script>console.log('never include me')</script>
</div>
<div id="guide-teams-view" class="container detail-view">
  <h2>Microsoft Teams Setup Guide</h2>
  <p>Register an incoming webhook in your Teams channel settings.</p>
</div>
<div id="footer">site footer</div>`;

const OPENAPI = {
  info: { title: 'Backstory API', version: '1.2', description: 'Read-only REST + Query API.' },
  servers: [{ url: 'https://api.people.ai' }],
  paths: {
    '/auth/v1/tokens': { post: { tags: ['Authentication'], summary: 'Issue a bearer token' } },
    '/v0/public/accounts': { get: { tags: ['Accounts'], summary: 'List accounts' } },
    '/v0/public/accounts/{id}': { get: { tags: ['Accounts'], summary: 'Get one account' } },
  },
};

describe('stripHtml', () => {
  it('removes tags and scripts, decodes entities, collapses whitespace', () => {
    const s = stripHtml('<h2>Hi &amp; bye</h2>\n<script>evil()</script> <p>ok&nbsp;then</p>');
    expect(s).toBe('Hi & bye ok then');
  });
});

describe('guideChunks', () => {
  it('builds one chunk per guide section with the h2 as title', () => {
    const chunks = guideChunks(GUIDE_HTML);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].id).toBe('guide:guide-slack-view');
    expect(chunks[0].title).toBe('Setup guide: Slack Bot Setup Guide');
    expect(chunks[0].text).toContain('bot token');
    expect(chunks[0].text).not.toContain('never include me');
    expect(chunks[0].keywords).toContain('slack');
    expect(chunks[1].title).toContain('Microsoft Teams');
  });
  it('soft-fails to [] when no guide sections exist', () => {
    expect(guideChunks('<html><body>no guides here</body></html>')).toEqual([]);
    expect(guideChunks('')).toEqual([]);
  });
});

describe('apiChunks', () => {
  it('builds an overview chunk plus one per tag', () => {
    const chunks = apiChunks(OPENAPI);
    expect(chunks[0].id).toBe('api:overview');
    expect(chunks[0].text).toContain('https://api.people.ai');
    const accounts = chunks.find((c) => c.id === 'api:accounts');
    expect(accounts.text).toContain('GET /v0/public/accounts — List accounts');
    expect(accounts.text).toContain('GET /v0/public/accounts/{id} — Get one account');
    const auth = chunks.find((c) => c.id === 'api:authentication');
    expect(auth.text).toContain('POST /auth/v1/tokens — Issue a bearer token');
  });
  it('is safe on an empty spec', () => {
    const chunks = apiChunks({});
    expect(chunks).toHaveLength(1);
    expect(chunks[0].id).toBe('api:overview');
  });
});

describe('buildKnowledgeChunks', () => {
  it('assembles all sources and drops near-empty chunks', () => {
    const chunks = buildKnowledgeChunks({
      workflows: WF,
      skills: SK,
      mcpTools: MCP,
      openapi: OPENAPI,
      legacyHtml: GUIDE_HTML,
    });
    const types = new Set(chunks.map((c) => c.type));
    expect(types).toEqual(new Set(['concept', 'workflow', 'signal', 'mcp', 'api', 'guide']));
    for (const c of chunks) {
      expect(c.id).toBeTruthy();
      expect(c.text.length).toBeGreaterThanOrEqual(40);
      expect(Array.isArray(c.keywords)).toBe(true);
    }
  });
  it('works with everything missing', () => {
    const chunks = buildKnowledgeChunks({});
    expect(chunks.length).toBeGreaterThanOrEqual(1); // concepts survive
  });
});
