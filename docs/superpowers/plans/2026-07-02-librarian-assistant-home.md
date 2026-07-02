# Backstory Librarian Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The AI assistant becomes the site's home page (a Gemini-style greeting + composer), backed by a full-site knowledge index with BM25-lite retrieval, with all navigation moved into a hamburger menu.

**Architecture:** A build-time script chunks every content source (workflows, signals, MCP tools, API docs, setup guides) into `web/api/_knowledge-index.js`; the chat serverless function scores chunks per turn and injects the top matches into a new `platform` (librarian) system prompt. On the client, chat state is extracted from the floating widget into a shared React context (`ChatProvider`) persisted to localStorage, consumed by both the widget and the new `AssistantHome` page at `/`.

**Tech Stack:** React 18 + Vite + Tailwind (existing `ac-*` dark tokens), react-router 6 (HashRouter), Radix Dialog, Vercel serverless functions, `@anthropic-ai/sdk` with zod structured output, vitest (node environment — no DOM/component tests).

**Spec:** `docs/superpowers/specs/2026-07-02-librarian-assistant-home-design.md`

## Global Constraints

- Working directory for all commands: `/Users/james.mcdaniel/Backstory_Workflows/web` unless a step says otherwise. Test command: `npx vitest run <file>` (or `npm test` for all).
- The legacy root `index.html` is **read-only input** (guide extraction). Never modify it or anything outside `web/` except this plan's checkboxes.
- Design tokens only — no new colors/fonts: `bg-ac-ink` (pure black), `bg-ac-card` (#0a0a0a), `bg-ac-warm-white` (input black), `border-ac-light-gray`, text `text-ac-dark`/`-secondary`/`ac-med-gray`, accent = white (`bg-white text-ac-ink` buttons, `ac-coral*` tokens are white). Structural type = `font-mono` (JetBrains Mono) uppercase with `///` prefix for eyebrows; prose = default DM Sans.
- Fixed values (from spec, use verbatim): localStorage key `backstory.chat.v1`; turn cap **40**; API messages cap **20**; retrieval defaults **k=8, maxChars=12000, minScore=1**; greeting boundaries hour **< 12** morning, **< 18** afternoon, else evening; attachments ≤ 4 files, 3MB each (existing).
- New API surface value is the string `platform`. Existing `workflows`/`skills` surfaces must keep working (back-compat, existing tests must not break).
- Generated files (`web/api/_catalog-index.js`, new `web/api/_knowledge-index.js`) are committed to git after running `npm run sync-data`.
- Every commit message ends with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Time-based greeting util

**Files:**
- Create: `web/src/lib/greeting.js`
- Test: `web/src/lib/__tests__/greeting.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `timeGreeting(hour: number) → 'Good morning' | 'Good afternoon' | 'Good evening'` — used by `AssistantHome` (Task 9) as `timeGreeting(new Date().getHours())`.

- [ ] **Step 1: Write the failing test**

```js
// web/src/lib/__tests__/greeting.test.js
import { describe, it, expect } from 'vitest';
import { timeGreeting } from '../greeting.js';

describe('timeGreeting', () => {
  it('is morning before noon', () => {
    expect(timeGreeting(0)).toBe('Good morning');
    expect(timeGreeting(6)).toBe('Good morning');
    expect(timeGreeting(11)).toBe('Good morning');
  });
  it('is afternoon from 12:00 to 17:59', () => {
    expect(timeGreeting(12)).toBe('Good afternoon');
    expect(timeGreeting(17)).toBe('Good afternoon');
  });
  it('is evening from 18:00 on', () => {
    expect(timeGreeting(18)).toBe('Good evening');
    expect(timeGreeting(23)).toBe('Good evening');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/greeting.test.js`
Expected: FAIL — "Failed to load ../greeting.js" (module does not exist).

- [ ] **Step 3: Write minimal implementation**

```js
// web/src/lib/greeting.js
// Time-of-day greeting for the Librarian home page. Boundaries per spec:
// <12 morning, <18 afternoon, else evening.
export function timeGreeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/greeting.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/greeting.js src/lib/__tests__/greeting.test.js
git commit -m "feat: time-based greeting util for the Librarian home page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Chat storage helpers (persist / cap / restore)

**Files:**
- Create: `web/src/lib/chatStorage.js`
- Test: `web/src/lib/__tests__/chatStorage.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces (used by `ChatProvider` in Task 8):
  - `STORAGE_KEY = 'backstory.chat.v1'`, `TURN_CAP = 40`
  - `capTurns(turns: Turn[], max = TURN_CAP) → Turn[]` (keeps the LAST `max`)
  - `loadTurns(storage) → Turn[]` — never throws; `[]` on any failure
  - `saveTurns(storage, turns) → void` — never throws
  - `clearTurns(storage) → void` — never throws
  - `storage` is any object with `getItem/setItem/removeItem` (window.localStorage or null).
  - A `Turn` is the existing shape: `{ role: 'user'|'assistant', content, recommendations?, draft?, artifact? }`.

- [ ] **Step 1: Write the failing test**

```js
// web/src/lib/__tests__/chatStorage.test.js
import { describe, it, expect } from 'vitest';
import { STORAGE_KEY, TURN_CAP, capTurns, loadTurns, saveTurns, clearTurns } from '../chatStorage.js';

function memStorage(initial = {}) {
  const m = { ...initial };
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: (k) => { delete m[k]; },
    _dump: () => m,
  };
}

describe('chatStorage', () => {
  it('round-trips turns through storage', () => {
    const s = memStorage();
    const turns = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello', recommendations: ['01-sales-digest'], draft: null, artifact: null },
    ];
    saveTurns(s, turns);
    expect(loadTurns(s)).toEqual(turns);
  });

  it('caps to the last TURN_CAP turns on save', () => {
    const s = memStorage();
    const turns = Array.from({ length: 50 }, (_, i) => ({ role: 'user', content: `m${i}` }));
    saveTurns(s, turns);
    const loaded = loadTurns(s);
    expect(loaded).toHaveLength(TURN_CAP);
    expect(loaded[0].content).toBe('m10');
    expect(loaded[TURN_CAP - 1].content).toBe('m49');
  });

  it('capTurns leaves short lists alone', () => {
    const t = [{ role: 'user', content: 'a' }];
    expect(capTurns(t)).toEqual(t);
    expect(capTurns([])).toEqual([]);
    expect(capTurns(null)).toEqual([]);
  });

  it('loadTurns returns [] on corrupt JSON, junk shapes, or a throwing storage', () => {
    expect(loadTurns(memStorage({ [STORAGE_KEY]: '{not json' }))).toEqual([]);
    expect(loadTurns(memStorage({ [STORAGE_KEY]: '"a string"' }))).toEqual([]);
    expect(loadTurns(memStorage({ [STORAGE_KEY]: JSON.stringify([{ role: 'user', content: 'ok' }, { bogus: 1 }]) })))
      .toEqual([{ role: 'user', content: 'ok' }]);
    expect(loadTurns({ getItem() { throw new Error('denied'); } })).toEqual([]);
    expect(loadTurns(null)).toEqual([]);
  });

  it('saveTurns and clearTurns never throw, even on a broken storage', () => {
    expect(() => saveTurns({ setItem() { throw new Error('quota'); } }, [{ role: 'user', content: 'x' }])).not.toThrow();
    expect(() => saveTurns(null, [])).not.toThrow();
    expect(() => clearTurns({ removeItem() { throw new Error('denied'); } })).not.toThrow();
    expect(() => clearTurns(null)).not.toThrow();
  });

  it('clearTurns removes the key', () => {
    const s = memStorage();
    saveTurns(s, [{ role: 'user', content: 'x' }]);
    clearTurns(s);
    expect(loadTurns(s)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/chatStorage.test.js`
Expected: FAIL — module `../chatStorage.js` not found.

- [ ] **Step 3: Write minimal implementation**

```js
// web/src/lib/chatStorage.js
// Persistence for the single shared Librarian conversation. All entry points
// are exception-safe: storage may be null (SSR/tests), full (quota), or
// blocked (privacy mode) — the chat then simply lives in memory.
export const STORAGE_KEY = 'backstory.chat.v1';
export const TURN_CAP = 40;

export function capTurns(turns, max = TURN_CAP) {
  if (!Array.isArray(turns)) return [];
  return turns.length > max ? turns.slice(turns.length - max) : turns;
}

export function loadTurns(storage) {
  try {
    const raw = storage && storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return capTurns(parsed.filter((t) => t && (t.role === 'user' || t.role === 'assistant')));
  } catch {
    return [];
  }
}

export function saveTurns(storage, turns) {
  try {
    if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(capTurns(turns)));
  } catch {
    /* quota / privacy mode — conversation stays in memory */
  }
}

export function clearTurns(storage) {
  try {
    if (storage) storage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/chatStorage.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chatStorage.js src/lib/__tests__/chatStorage.test.js
git commit -m "feat: exception-safe localStorage persistence helpers for the shared chat

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Knowledge lib — workflow, signal, MCP, concept chunks

**Files:**
- Create: `web/scripts/knowledge-lib.mjs`
- Test: `web/scripts/__tests__/knowledge-lib.test.js`
- Modify: `web/vitest.config.js` (add `scripts/**/*.test.js` to `include`)

**Interfaces:**
- Consumes: raw parsed JSON — workflows from `workflows.json` (keys incl. `id,name,description,category,trigger,output,node_flow,platforms`), skills from `skills/skills.json` (keys incl. `id,name,description,category,audience,input,mcpTools,walkthrough`), MCP tools as `[{ name, description, usedBy: string[] }]` (the enriched list `sync-data.mjs` already builds).
- Produces (Task 4 extends this module; Task 5 consumes `buildKnowledgeChunks`): every builder returns `Chunk[]` where `Chunk = { id: string, type: 'workflow'|'signal'|'mcp'|'api'|'guide'|'concept', title: string, text: string, keywords: string[] }`.
  - `truncate(text, max) → string` (whitespace-collapsed, `…`-terminated)
  - `workflowChunks(workflows) → Chunk[]`
  - `signalChunks(skills) → Chunk[]`
  - `mcpChunks(tools) → Chunk[]` (one overview chunk + one per tool)
  - `conceptChunks() → Chunk[]`

- [ ] **Step 1: Add scripts tests to the vitest include**

In `web/vitest.config.js` change the `include` line:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'api/**/*.test.js', 'scripts/**/*.test.js'],
  },
});
```

- [ ] **Step 2: Write the failing test**

```js
// web/scripts/__tests__/knowledge-lib.test.js
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run scripts/__tests__/knowledge-lib.test.js`
Expected: FAIL — module `../knowledge-lib.mjs` not found.

- [ ] **Step 4: Write the implementation**

```js
// web/scripts/knowledge-lib.mjs
// Pure chunk builders for the Librarian knowledge index. No filesystem access
// here — sync-data.mjs reads the sources and passes parsed data in, so every
// builder is unit-testable. Each chunk: { id, type, title, text, keywords }.

const CAP = { workflow: 2000, signal: 2000, mcp: 800, api: 2500, guide: 4000, concept: 1500 };

const asText = (v) => (typeof v === 'string' ? v : v == null ? '' : JSON.stringify(v));

export function truncate(text, max) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function workflowChunks(workflows) {
  return (workflows || []).map((w) => {
    const platforms = Object.keys(w.platforms || {}).join(', ');
    const parts = [
      asText(w.description),
      w.trigger && `Trigger: ${asText(w.trigger)}`,
      w.output && `Output: ${asText(w.output)}`,
      w.node_flow && `How it works: ${asText(w.node_flow)}`,
      platforms && `Platforms: ${platforms}`,
    ].filter(Boolean);
    return {
      id: `workflow:${w.id}`,
      type: 'workflow',
      title: `${w.name} (Auto flow)`,
      text: truncate(parts.join('\n'), CAP.workflow),
      keywords: [w.id, w.category, 'workflow', 'auto flow', 'automation'].filter(Boolean),
    };
  });
}

export function signalChunks(skills) {
  return (skills || []).map((s) => {
    const parts = [
      asText(s.description),
      s.audience && `Audience: ${asText(s.audience)}`,
      s.input && `Input: ${asText(s.input)}`,
      Array.isArray(s.mcpTools) && s.mcpTools.length && `MCP tools used: ${s.mcpTools.join(', ')}`,
      s.walkthrough && `Walkthrough: ${asText(s.walkthrough)}`,
    ].filter(Boolean);
    return {
      id: `signal:${s.id}`,
      type: 'signal',
      title: `${s.name} (Signal)`,
      text: truncate(parts.join('\n'), CAP.signal),
      keywords: [s.id, s.category, 'signal', 'skill'].filter(Boolean),
    };
  });
}

export function mcpChunks(tools) {
  const list = tools || [];
  const overview = {
    id: 'mcp:overview',
    type: 'mcp',
    title: 'Backstory MCP overview',
    text: truncate(
      `The Backstory MCP (Model Context Protocol) server is the shared data layer under every workflow and signal. It exposes ${list.length} tools for live account, opportunity, activity, people, and company-news data: ${list.map((t) => t.name).join(', ')}.`,
      CAP.mcp,
    ),
    keywords: ['mcp', 'model context protocol', 'server', 'tools', 'backstory'],
  };
  const each = list.map((t) => ({
    id: `mcp:${t.name}`,
    type: 'mcp',
    title: `MCP tool: ${t.name}`,
    text: truncate(
      `${t.description}${t.usedBy && t.usedBy.length ? `\nUsed by: ${t.usedBy.join(', ')}` : ''}`,
      CAP.mcp,
    ),
    keywords: [t.name, 'mcp', 'tool', 'backstory mcp'],
  }));
  return [overview, ...each];
}

export function conceptChunks() {
  return [
    {
      id: 'concept:library',
      type: 'concept',
      title: 'What the Backstory Automation Library is',
      text: truncate(
        `The Backstory Automation Library is a catalogue of revenue-team automation in three layers. Workflows (browsed as "Auto flows") are scheduled agents that run on n8n, Workato, Zapier, or a Claude/OpenAI orchestrator: they trigger on a schedule or event, pull live account and deal context from Backstory over MCP, reason with an LLM, and deliver an outcome such as a Slack message, an email, a CRM update, or a brief. Signals (also called skills) are packaged instruction sets a person drops into an AI assistant to do one sales job well on demand — account planning, QBR prep, MEDDPICC qualification. The Backstory MCP server is the shared data layer both call for accounts, opportunities, activity, engaged people, and company news. The site also hosts API docs for the read-only REST + Query API at api.people.ai, and setup guides for Slack, Microsoft Teams, email, Google Chat, cross-tool delivery, and the Backstory MCP itself.`,
        CAP.concept,
      ),
      keywords: ['library', 'catalogue', 'about', 'workflows', 'signals', 'skills', 'mcp', 'overview'],
    },
  ];
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run scripts/__tests__/knowledge-lib.test.js`
Expected: PASS (8 tests).

- [ ] **Step 6: Run the whole suite (config change regression check)**

Run: `npm test`
Expected: all suites pass, now including the `scripts/` one.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.js scripts/knowledge-lib.mjs scripts/__tests__/knowledge-lib.test.js
git commit -m "feat: knowledge chunk builders for workflows, signals, MCP, concepts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Knowledge lib — HTML stripping, setup-guide and API-doc chunks, assembler

**Files:**
- Modify: `web/scripts/knowledge-lib.mjs` (append new functions)
- Modify: `web/scripts/__tests__/knowledge-lib.test.js` (append new tests)

**Interfaces:**
- Consumes: Task 3's `truncate`, `CAP`.
- Produces (Task 5 consumes `buildKnowledgeChunks`; Task 6+ consume the `Chunk` shape):
  - `stripHtml(html: string) → string` (tags/scripts/styles removed, entities decoded, whitespace collapsed)
  - `guideChunks(html: string) → Chunk[]` — one per `id="guide-*-view"` section; `[]` when none found (soft-fail)
  - `apiChunks(openapi: object) → Chunk[]` — one overview + one per OpenAPI tag
  - `buildKnowledgeChunks({ workflows, skills, mcpTools, openapi, legacyHtml }) → Chunk[]` — everything concatenated, chunks with `text` shorter than 40 chars dropped

- [ ] **Step 1: Write the failing tests (append to the existing test file)**

```js
// append to web/scripts/__tests__/knowledge-lib.test.js
import { stripHtml, guideChunks, apiChunks, buildKnowledgeChunks } from '../knowledge-lib.mjs';

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
```

Note: `WF`, `SK`, `MCP` are the fixtures already defined at the top of this test file (Task 3). Put the new `import` line at the top of the file with the existing import.

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run scripts/__tests__/knowledge-lib.test.js`
Expected: FAIL — `stripHtml` etc. are not exported.

- [ ] **Step 3: Append the implementation to `knowledge-lib.mjs`**

```js
// append to web/scripts/knowledge-lib.mjs

export function stripHtml(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#8592;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract each legacy setup-guide section (id="guide-*-view") as one chunk.
// Slices run marker-to-marker; the last section ends at the next top-level
// div-with-id (or a hard 60KB ceiling). Returns [] when the legacy markup
// changes shape — the build must never fail on this.
export function guideChunks(html) {
  const src = String(html ?? '');
  const re = /id="(guide-[a-z-]+-view)"/g;
  const marks = [];
  let m;
  while ((m = re.exec(src))) marks.push({ id: m[1], at: m.index });
  return marks.map((mark, i) => {
    let end;
    if (i + 1 < marks.length) {
      end = marks[i + 1].at;
    } else {
      const nextDiv = src.indexOf('<div id="', mark.at + 1);
      end = nextDiv === -1 ? Math.min(src.length, mark.at + 60000) : nextDiv;
    }
    const slice = src.slice(mark.at, end);
    const h2 = slice.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const title = h2 ? stripHtml(h2[1]) : mark.id.replace(/^guide-|-view$/g, '').replace(/-/g, ' ');
    const short = mark.id.replace(/^guide-/, '').replace(/-view$/, '');
    return {
      id: `guide:${mark.id}`,
      type: 'guide',
      title: `Setup guide: ${title}`,
      text: truncate(stripHtml(slice), CAP.guide),
      keywords: [...short.split('-'), 'setup', 'guide', 'integration', 'connect'],
    };
  });
}

export function apiChunks(openapi) {
  const oa = openapi || {};
  const byTag = {};
  for (const [route, ops] of Object.entries(oa.paths || {})) {
    for (const [method, op] of Object.entries(ops || {})) {
      if (!op || typeof op !== 'object' || !['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      const tag = (Array.isArray(op.tags) && op.tags[0]) || 'General';
      (byTag[tag] = byTag[tag] || []).push(
        `${method.toUpperCase()} ${route} — ${op.summary || op.operationId || ''}`.trim(),
      );
    }
  }
  const info = oa.info || {};
  const server = ((oa.servers || [])[0] || {}).url || '';
  const overview = {
    id: 'api:overview',
    type: 'api',
    title: 'Backstory API overview',
    text: truncate(
      [
        `${info.title || 'Backstory API'}${info.version ? ` (v${info.version})` : ''}${server ? ` — base URL ${server}` : ''}.`,
        info.description || '',
        Object.keys(byTag).length ? `Endpoint groups: ${Object.keys(byTag).join(', ')}.` : '',
        'Full reference lives on the API Docs page.',
      ].filter(Boolean).join(' '),
      CAP.api,
    ),
    keywords: ['api', 'rest', 'endpoints', 'authentication', 'token', 'docs', 'people.ai'],
  };
  const groups = Object.entries(byTag).map(([tag, lines]) => ({
    id: `api:${tag.toLowerCase().replace(/\s+/g, '-')}`,
    type: 'api',
    title: `API endpoints: ${tag}`,
    text: truncate(lines.join('\n'), CAP.api),
    keywords: [tag.toLowerCase(), 'api', 'endpoint', 'rest'],
  }));
  return [overview, ...groups];
}

export function buildKnowledgeChunks({ workflows = [], skills = [], mcpTools = [], openapi = null, legacyHtml = '' } = {}) {
  const chunks = [
    ...conceptChunks(),
    ...workflowChunks(workflows),
    ...signalChunks(skills),
    ...mcpChunks(mcpTools),
    ...(openapi ? apiChunks(openapi) : []),
    ...guideChunks(legacyHtml),
  ];
  return chunks.filter((c) => c.text && c.text.length >= 40);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/__tests__/knowledge-lib.test.js`
Expected: PASS (all Task 3 + Task 4 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/knowledge-lib.mjs scripts/__tests__/knowledge-lib.test.js
git commit -m "feat: setup-guide and API-doc chunk extraction + knowledge assembler

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Emit `_knowledge-index.js` from sync-data

**Files:**
- Modify: `web/scripts/sync-data.mjs` (after the `_catalog-index.js` write, ~line 77)
- Create (generated, committed): `web/api/_knowledge-index.js`

**Interfaces:**
- Consumes: `buildKnowledgeChunks` (Task 4); the `workflows`, `skills`, and enriched `mcp` arrays already computed in `sync-data.mjs` (lines 46–59).
- Produces: `web/api/_knowledge-index.js` exporting `export const chunks = [...]` — imported by `_anthropic.js` in Task 7.

- [ ] **Step 1: Add the emit block to `sync-data.mjs`**

Insert directly after the existing `console.log('sync-data: wrote web/api/_catalog-index.js');` line:

```js
// Emit the full-site knowledge index for the Librarian (retrieval corpus).
// Guide + API sources are optional: a missing/changed source logs a warning
// and its chunks are skipped — the build itself must never fail here.
import { buildKnowledgeChunks } from './knowledge-lib.mjs';
```

(Put the `import` at the top of the file with the other imports; ESM imports must be top-level. Then, after the `_catalog-index.js` write:)

```js
let openapi = null;
let legacyHtml = '';
try {
  openapi = JSON.parse(readFileSync(resolve(repo, 'openapi.json'), 'utf8'));
} catch (e) {
  console.warn('sync-data: knowledge index — openapi.json skipped:', e.message);
}
try {
  legacyHtml = readFileSync(resolve(repo, 'index.html'), 'utf8');
} catch (e) {
  console.warn('sync-data: knowledge index — legacy guides skipped:', e.message);
}
const knowledge = buildKnowledgeChunks({ workflows, skills, mcpTools: mcp, openapi, legacyHtml });
if (!knowledge.some((c) => c.type === 'guide')) {
  console.warn('sync-data: knowledge index — no guide chunks extracted (legacy markup changed?)');
}
writeFileSync(
  resolve(apiDir, '_knowledge-index.js'),
  '// Generated by scripts/sync-data.mjs — do not edit by hand.\n' +
    `export const chunks = ${JSON.stringify(knowledge, null, 1)};\n`,
);
console.log(`sync-data: wrote web/api/_knowledge-index.js (${knowledge.length} chunks)`);
```

- [ ] **Step 2: Run the sync and sanity-check the output**

Run: `npm run sync-data`
Expected output includes: `sync-data: wrote web/api/_knowledge-index.js (N chunks)` with N ≈ 95–130 (1 concept + 38 workflows + 30 signals + ~10 MCP + ~12 API + 6 guides), and NO "no guide chunks" warning.

Then verify shape and coverage:

```bash
node -e "
import('./api/_knowledge-index.js').then(({ chunks }) => {
  const by = {};
  for (const c of chunks) by[c.type] = (by[c.type] || 0) + 1;
  console.log('counts by type:', by);
  console.log('total chars:', chunks.reduce((n, c) => n + c.text.length, 0));
  const guide = chunks.find((c) => c.type === 'guide');
  console.log('sample guide:', guide && guide.title);
  if (!by.guide || by.guide < 6) throw new Error('expected 6 guide chunks');
  if (!by.workflow || by.workflow < 38) throw new Error('expected 38 workflow chunks');
});"
```

Expected: counts printed, 6 guides, 38 workflows, no throw.

- [ ] **Step 3: Run the full suite (nothing should regress)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit (including the generated index, matching `_catalog-index.js` practice)**

```bash
git add scripts/sync-data.mjs api/_knowledge-index.js
git commit -m "feat: emit full-site knowledge index (_knowledge-index.js) at sync time

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Retrieval module (BM25-lite)

**Files:**
- Create: `web/api/_retrieval.js`
- Test: `web/api/__tests__/retrieval.test.js`

**Interfaces:**
- Consumes: the `Chunk` shape (`{ id, type, title, text, keywords }`).
- Produces (Task 7 consumes all three):
  - `tokenize(text) → string[]` (lowercase, alphanumeric split, stopwords and 1-char tokens dropped)
  - `selectChunks(query: string, chunks: Chunk[], { k = 8, maxChars = 12000, minScore = 1 } = {}) → Chunk[]` (relevance-ordered)
  - `retrievalQuery(messages: {role, content}[]) → string` (latest user message; prepends the previous user message when the latest has < 4 tokens)
  - Also exports `scoreChunk(queryTokens: string[], chunk) → number` for tests.

- [ ] **Step 1: Write the failing test**

```js
// web/api/__tests__/retrieval.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/__tests__/retrieval.test.js`
Expected: FAIL — module `../_retrieval.js` not found.

- [ ] **Step 3: Write the implementation**

```js
// web/api/_retrieval.js
// BM25-lite keyword retrieval over the build-time knowledge index. Pure
// functions, no I/O; one pass per request keeps the chat function at a
// single LLM call. Deliberately no embeddings — the corpus is ~120 chunks.

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'do', 'does', 'for', 'from',
  'has', 'have', 'how', 'i', 'if', 'in', 'is', 'it', 'its', 'me', 'my', 'not', 'of', 'on', 'or',
  'our', 'so', 'that', 'the', 'their', 'them', 'they', 'this', 'to', 'up', 'us', 'was', 'we',
  'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'you', 'your',
]);

export function tokenize(text) {
  return String(text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function termFreq(tokens) {
  const tf = {};
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
  return tf;
}

// Term frequency with saturation (a term's 5th repeat adds little), a 3x
// weight for title/keyword hits, and mild length normalization so long
// chunks don't win on volume alone. Caches per-chunk token stats on the
// chunk object (cheap warm-instance win in the serverless function).
export function scoreChunk(queryTokens, chunk) {
  if (!queryTokens.length) return 0;
  if (!chunk._tf) {
    const bodyTokens = tokenize(chunk.text);
    chunk._tf = termFreq(bodyTokens);
    chunk._len = bodyTokens.length;
    chunk._head = new Set(tokenize(`${chunk.title} ${(chunk.keywords || []).join(' ')}`));
  }
  const lenNorm = 1 / (1 + chunk._len / 400);
  let score = 0;
  for (const q of new Set(queryTokens)) {
    const tf = chunk._tf[q] || 0;
    if (tf) score += (tf / (tf + 1.5)) * lenNorm;
    if (chunk._head.has(q)) score += 3;
  }
  return score;
}

export function selectChunks(query, chunks, { k = 8, maxChars = 12000, minScore = 1 } = {}) {
  const q = tokenize(query);
  if (!q.length || !Array.isArray(chunks) || !chunks.length) return [];
  const ranked = chunks
    .map((c) => ({ c, s: scoreChunk(q, c) }))
    .filter((x) => x.s >= minScore)
    .sort((a, b) => b.s - a.s)
    .slice(0, k);
  const out = [];
  let used = 0;
  for (const { c } of ranked) {
    const cost = (c.title || '').length + (c.text || '').length + 16;
    if (used + cost > maxChars) break;
    out.push(c);
    used += cost;
  }
  return out;
}

// The retrieval query is the latest user message; very short follow-ups
// ("how?", "and teams?") borrow the previous user message for subject.
export function retrievalQuery(messages) {
  const users = (messages || []).filter((m) => m && m.role === 'user' && typeof m.content === 'string');
  if (!users.length) return '';
  const last = users[users.length - 1].content;
  if (tokenize(last).length >= 4 || users.length < 2) return last;
  return `${users[users.length - 2].content}\n${last}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/__tests__/retrieval.test.js`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_retrieval.js api/__tests__/retrieval.test.js
git commit -m "feat: BM25-lite retrieval over the knowledge index

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: `platform` surface — librarian prompt, retrieval wiring, API acceptance

**Files:**
- Modify: `web/api/_anthropic.js`
- Modify: `web/api/chat.js:11` (surface allowlist)
- Modify: `web/api/submit.js:1,30,64` (LABEL map + allowlist)
- Test: `web/api/__tests__/anthropic.test.js`, `web/api/__tests__/chat.test.js`, `web/api/__tests__/submit.test.js` (append cases)

**Interfaces:**
- Consumes: `chunks` from `./_knowledge-index.js` (Task 5); `selectChunks`, `retrievalQuery` from `./_retrieval.js` (Task 6).
- Produces (client Task 8 relies on): `POST /api/chat` accepts `surface: 'platform'` and returns the existing reply shape unchanged (`{reply, recommendations, proposingDraft, draft, buildsArtifact, artifact}`); `POST /api/submit` accepts `surface: 'platform'`. `buildSystemPrompt(surface, persona, pageContext, retrievedBlock = '')` gains an optional 4th arg (appended verbatim for every surface).

- [ ] **Step 1: Write the failing tests (append to the three existing test files)**

Append to `web/api/__tests__/anthropic.test.js` inside `describe('buildSystemPrompt', ...)`:

```js
  it('platform surface returns the librarian prompt with both catalogues and strategy', () => {
    const p = buildSystemPrompt('platform');
    expect(p).toContain('Librarian');
    expect(p.toLowerCase()).toContain('strategy');
    // ids from both generated catalogues appear
    expect(p).toMatch(/\d{2}-[a-z-]+/); // a workflow id
    expect(p).toContain('Signals catalogue');
  });
  it('appends the retrieved block for any surface when provided', () => {
    const block = 'Relevant library detail:\n### Setup guide: Slack\nCreate a Slack app…';
    expect(buildSystemPrompt('platform', null, null, block)).toContain('### Setup guide: Slack');
    expect(buildSystemPrompt('workflows', null, null, block)).toContain('### Setup guide: Slack');
  });
```

Append to `web/api/__tests__/chat.test.js` inside `describe('/api/chat handler', ...)`:

```js
  it('accepts the platform surface', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    runAssistant.mockResolvedValue({ reply: 'ok', recommendations: [], proposingDraft: false, draft: null });
    const res = mockRes();
    await handler({ method: 'POST', body: { surface: 'platform', messages: [{ role: 'user', content: 'hi' }] } }, res);
    expect(res.statusCode).toBe(200);
    expect(runAssistant).toHaveBeenCalledWith(expect.objectContaining({ surface: 'platform' }));
  });
```

Append to `web/api/__tests__/submit.test.js` (match its existing mockRes/env conventions; ensure `GITHUB_TOKEN` is unset in the test so the handler takes the no-token fallback path):

```js
  it('accepts the platform surface (no-token fallback URL)', async () => {
    delete process.env.GITHUB_TOKEN;
    const res = mockRes();
    await handler({ method: 'POST', body: { surface: 'platform', draft: { title: 'Renewal radar' } } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.fallbackUrl).toContain('github.com');
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run api/__tests__/anthropic.test.js api/__tests__/chat.test.js api/__tests__/submit.test.js`
Expected: the three new cases FAIL (platform rejected / librarian text missing); all pre-existing cases PASS.

- [ ] **Step 3: Implement in `_anthropic.js`**

3a. Add imports at the top:

```js
import { chunks } from './_knowledge-index.js';
import { selectChunks, retrievalQuery } from './_retrieval.js';
```

3b. Extract the shared output contract so both prompt paths use identical rules. The existing `buildSystemPrompt` body text from `For every turn return the structured object:` through the final n8n-shape paragraph (currently the tail of the template literal, lines ~82–97) moves verbatim into:

```js
function outputContract(noun) {
  return `For every turn return the structured object:
- "reply": always present, conversational. When you build an artifact, briefly say what you produced and how to use it.
- "recommendations": the ids of existing catalogue items that fit, most relevant first. Use ids exactly as written in the catalogues above. Empty if nothing fits.
- "proposingDraft": true when you've built or are proposing a new ${noun} the user could submit to the marketplace to strengthen the catalogue.
- "draft": when proposingDraft is true, a concrete new ${noun} — title (short), summary (what it does and the outcome), stack (the Backstory tech it uses), spec (a short build outline). When proposingDraft is false, set every draft field to an empty string.
- "buildsArtifact": true whenever the user is building or creating a ${noun} (a "build…" request, the builder panel, or "make me a…"). On any build you MUST set this true and fill artifact — never return a build as a draft/spec only.
- "artifact": when buildsArtifact is true, the COMPLETE, ready-to-use build output:
    - platform: the target platform (n8n, Workato, Zapier, Claude workflow, or OpenAI workflow).
    - filename: a sensible filename with the right extension (e.g. "champion-silence-alert.json" or "...-instructions.md").
    - language: "json" for n8n/Workato/Zapier exports, "markdown" for Claude/OpenAI workflow instructions.
    - content: the full artifact. For n8n produce a structurally valid, importable n8n workflow JSON (nodes + connections, with Backstory MCP, an LLM step, and delivery). For Workato/Zapier produce the recipe/Zap definition. For Claude/OpenAI workflow produce complete orchestrator instructions (MCP setup, the system prompt/steps, tool calls, and delivery) in markdown. Generate real, complete content — never a stub or "TODO".
  When buildsArtifact is false, set platform/filename/language/content to empty strings.
${N8N_SHAPE}`;
}
```

…where `N8N_SHAPE` is a module-level `const` holding the existing two n8n paragraphs verbatim (the `When the target platform is n8n, …` JSON-shape text and the `Pick the right real node types…` paragraph). The existing workflows/skills prompt then ends with `${outputContract(noun)}` instead of the inlined text. **The wording of the recommendations bullet changes slightly (from "existing ${noun}s" to "existing catalogue items") for all surfaces — this is intentional so platform can mix both kinds.**

3c. Add the librarian branch at the top of `buildSystemPrompt` and the new 4th parameter:

```js
export function buildSystemPrompt(surface, persona, pageContext, retrievedBlock = '') {
  const personaLine = persona
    ? `The person you're helping is a ${persona}. Tailor language, examples, and recommendations to that role.`
    : `You don't know the person's role yet — keep it warm, concrete, and jargon-light.`;
  const contextLine = pageContext ? `\nPage context: ${pageContext}\n` : '';

  if (surface === 'platform') {
    const wfItems = (catalog.workflows || [])
      .map((i) => `- ${i.id} | ${i.name} [${i.category}${i.status ? ', ' + i.status : ''}] — ${i.description}`)
      .join('\n');
    const skItems = (catalog.skills || [])
      .map((i) => `- ${i.id} | ${i.name} [${i.category}${i.status ? ', ' + i.status : ''}] — ${i.description}`)
      .join('\n');
    return `You are the Backstory Librarian — the brain of the Backstory Automation Library and the assistant on its home page. You know everything published on this site: the Auto flows (workflow) catalogue, the Signals (skills) catalogue, the Backstory MCP tools, the API docs, and the setup guides. You help revenue and technical teams understand the platform, find the right item, build new workflows, and think through automation strategy.

Voice: confident, lightly opinionated, decisive. Recommend a clear best option and say why; name trade-offs briefly. Never read like API docs. Keep replies to a few sentences unless the user asks you to go deep.

${personaLine}
${contextLine}
${CONCEPTS}

You do four jobs:
1. EXPLAIN — answer questions about anything on the site (what a workflow, signal, or MCP tool is or does; how the API authenticates; what a setup guide covers) plainly, with a quick concrete example. Set proposingDraft and buildsArtifact false for pure explanations.
2. FIND — when someone describes a need, recommend the best-fitting workflows and/or signals by id. Mixing kinds is fine; most relevant first.
3. BUILD — when the user wants to build, actually build it: produce the real, downloadable artifact (buildsArtifact true, artifact filled), never just an outline. Default platform is n8n if they don't name one. Use any attached file as the basis.
4. STRATEGIZE — talk through automation strategy: which flows and signals to adopt first for a goal (pipeline hygiene, churn prevention, forecast discipline), how they combine over the shared MCP data layer, what to sequence next. Ground every strategy point in actual catalogue items by id — never invent capabilities the library doesn't have.
${mcpBlock()}
Auto flows catalogue (id | name [category, status] — description):
${wfItems}

Signals catalogue (id | name [category, status] — description):
${skItems}
${retrievedBlock}
${outputContract('workflow')}`;
  }

  // …existing workflows/skills prompt follows, unchanged except:
  //   – its tail becomes ${outputContract(noun)}
  //   – append ${retrievedBlock} just before the output contract, after the otherItems list.
}
```

3d. Wire retrieval into `runAssistant` (fail-open):

```js
export async function runAssistant({ surface, messages, persona, attachments, pageContext, client }) {
  const c = client || new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
  let retrievedBlock = '';
  try {
    const picked = selectChunks(retrievalQuery(messages), chunks);
    if (picked.length) {
      retrievedBlock =
        '\nRelevant library detail (retrieved for this question — prefer it over guessing):\n' +
        picked.map((k) => `### ${k.title}\n${k.text}`).join('\n\n') +
        '\n';
    }
  } catch {
    /* fail-open: the compact catalogue index above is still in the prompt */
  }
  const response = await c.messages.parse({
    model,
    max_tokens: 8192,
    system: buildSystemPrompt(surface, persona, pageContext, retrievedBlock),
    messages: buildMessages(messages, attachments),
    output_config: { format: zodOutputFormat(ReplySchema) },
  });
  return normalizeReply(response.parsed_output);
}
```

- [ ] **Step 4: Widen the two allowlists**

`web/api/chat.js` line 11:

```js
  if (!['workflows', 'skills', 'platform'].includes(surface) || !Array.isArray(messages)) {
```

`web/api/submit.js` line 1 and line 30:

```js
const LABEL = { workflows: 'workflow', skills: 'skill', platform: 'library' };
```

```js
  if (!['workflows', 'skills', 'platform'].includes(surface) || (!baseTitle && !(artifact && artifact.content))) {
```

- [ ] **Step 5: Run the API tests**

Run: `npx vitest run api/__tests__/`
Expected: PASS — all pre-existing and new cases (if a pre-existing anthropic test asserted the exact old recommendations wording, update that assertion to the new "existing catalogue items" phrasing).

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/_anthropic.js api/chat.js api/submit.js api/__tests__/anthropic.test.js api/__tests__/chat.test.js api/__tests__/submit.test.js
git commit -m "feat: platform (Librarian) surface with per-turn knowledge retrieval

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Shared chat store; widget, GlobalAssistant, MessageList rewired to it

**Files:**
- Create: `web/src/lib/chatStore.jsx`
- Modify: `web/src/components/AssistantWidget.jsx` (consume the store; drop local chat state; add expand button; label becomes Librarian)
- Modify: `web/src/components/GlobalAssistant.jsx` (merged lookup with `kind`; hide on `/`; drop `surface`)
- Modify: `web/src/components/assistant/MessageList.jsx` (kind-based links; `surface` prop removed)
- Modify: `web/src/components/Layout.jsx` (wrap in `ChatProvider`)

**Interfaces:**
- Consumes: `sendChat/getPersona/appendUser/appendAssistant/toApiMessages/readFileToAttachment/buildPrompt` from `web/src/lib/assistant.js` (unchanged); `loadTurns/saveTurns/clearTurns` from Task 2; API `platform` surface from Task 7.
- Produces (Task 9 consumes): `<ChatProvider>` and `useAssistantChat() → { turns, pending, input, setInput, attachments, attachError, mode, setMode, ask(text, { attachments?, pageContext? }), addFiles(files), removeAttachment(i), resetChat() }`. `MessageList` new props: `({ turns, pending, lookup })` where `lookup = { [id]: { name, category, kind: 'workflow'|'signal' } }`.

- [ ] **Step 1: Create the store**

```jsx
// web/src/lib/chatStore.jsx
// One shared Librarian conversation for the whole app. The floating widget
// and the AssistantHome page are two skins over this store, so expanding
// from widget to page (or navigating) never loses the thread. Persisted to
// localStorage via chatStorage (exception-safe).
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  sendChat,
  getPersona,
  appendUser,
  appendAssistant,
  toApiMessages,
  readFileToAttachment,
} from './assistant';
import { loadTurns, saveTurns, clearTurns } from './chatStorage';

const ChatContext = createContext(null);
const storage = typeof window !== 'undefined' ? window.localStorage : null;
const API_MESSAGE_CAP = 20;

export function ChatProvider({ children }) {
  const [turns, setTurns] = useState(() => loadTurns(storage));
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [attachError, setAttachError] = useState('');
  const [mode, setMode] = useState('chat'); // 'chat' | 'builder'
  const persona = useMemo(() => getPersona(), []);

  useEffect(() => {
    saveTurns(storage, turns);
  }, [turns]);

  async function ask(text, { attachments: atts, pageContext } = {}) {
    const q = (text || '').trim();
    const sendAtts = atts !== undefined ? atts : attachments;
    if ((!q && (!sendAtts || !sendAtts.length)) || pending) return;
    const next = appendUser(turns, q || '📎 (see attached)');
    setTurns(next);
    setInput('');
    setAttachments([]);
    setAttachError('');
    setPending(true);
    try {
      const result = await sendChat({
        surface: 'platform',
        messages: toApiMessages(next).slice(-API_MESSAGE_CAP),
        persona,
        attachments: sendAtts,
        pageContext,
      });
      setTurns((t) => appendAssistant(t, result));
    } catch {
      setTurns((t) =>
        appendAssistant(t, {
          reply: 'The assistant is unavailable right now — please try again in a moment.',
          recommendations: [],
          proposingDraft: false,
        }),
      );
    } finally {
      setPending(false);
    }
  }

  async function addFiles(fileList) {
    setAttachError('');
    for (const f of Array.from(fileList || [])) {
      try {
        const att = await readFileToAttachment(f);
        setAttachments((prev) => (prev.length >= 4 ? prev : [...prev, att]));
      } catch (err) {
        setAttachError((err && err.message) || 'Could not attach that file');
      }
    }
  }

  function removeAttachment(i) {
    setAttachments((prev) => prev.filter((_, j) => j !== i));
  }

  function resetChat() {
    setTurns([]);
    setInput('');
    setAttachments([]);
    setAttachError('');
    setMode('chat');
    setPending(false);
    clearTurns(storage);
  }

  const value = {
    turns, pending, input, setInput, attachments, attachError,
    mode, setMode, ask, addFiles, removeAttachment, resetChat,
  };
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useAssistantChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useAssistantChat must be used inside <ChatProvider>');
  return ctx;
}
```

- [ ] **Step 2: Rewrite `AssistantWidget.jsx` to consume the store**

Full replacement:

```jsx
// web/src/components/AssistantWidget.jsx
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Sparkles, X, ArrowUp, Paperclip, Wrench, SquarePen, Maximize2 } from 'lucide-react';
import { MessageList } from './assistant/MessageList';
import { BuilderPanel } from './assistant/BuilderPanel';
import { useAssistantChat } from '../lib/chatStore';
import { buildPrompt } from '../lib/assistant';

export function AssistantWidget({ suggestions = [], lookup = {}, pageContext }) {
  const [open, setOpen] = useState(false);
  const chat = useAssistantChat();
  const fileRef = useRef(null);
  const navigate = useNavigate();

  function onSubmit(e) {
    e.preventDefault();
    chat.ask(chat.input, { pageContext });
  }

  function handleBuild(spec) {
    chat.setMode('chat');
    chat.ask(buildPrompt(spec), { pageContext });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-ac-ink shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5"
      >
        <Sparkles size={16} /> Ask AI
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[min(640px,calc(100vh-2.5rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-ac-light-gray bg-ac-card shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <header className="flex items-center justify-between border-b border-ac-light-gray px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ac-med-gray">/// Librarian</div>
          <div className="font-display text-[14px] font-bold text-ac-dark">Backstory AI</div>
        </div>
        <div className="flex items-center gap-2">
          {(chat.turns.length > 0 || chat.mode === 'builder') && (
            <button
              type="button"
              onClick={chat.resetChat}
              title="New chat"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ac-med-gray transition-colors hover:bg-ac-cream hover:text-ac-dark"
            >
              <SquarePen size={14} /> New
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/')}
            title="Open the Librarian page"
            className="text-ac-med-gray transition-colors hover:text-ac-dark"
          >
            <Maximize2 size={16} />
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-ac-med-gray transition-colors hover:text-ac-dark">
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {chat.mode === 'builder' ? (
          <BuilderPanel surface="platform" onBuild={handleBuild} onCancel={() => chat.setMode('chat')} />
        ) : chat.turns.length === 0 ? (
          <div>
            <p className="text-[13.5px] leading-6 text-ac-dark-secondary">
              I'm the Librarian — I know every flow, signal, MCP tool, guide, and API doc on this site. Ask me anything, or have me build you a workflow. You can attach an export, screenshot, or doc too.
            </p>
            <button
              type="button"
              onClick={() => chat.setMode('builder')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.07em] text-ac-ink"
            >
              <Wrench size={13} /> Build your own workflow
            </button>
            {suggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => chat.ask(s, { pageContext })}
                    className="rounded-full border border-ac-light-gray bg-ac-warm-white px-3 py-1 font-mono text-[11px] text-ac-dark-secondary transition-colors hover:border-ac-coral hover:text-ac-coral-dark"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <MessageList turns={chat.turns} pending={chat.pending} lookup={lookup} />
        )}
      </div>

      {chat.mode !== 'builder' && (
        <form onSubmit={onSubmit} className="border-t border-ac-light-gray p-3">
          {chat.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {chat.attachments.map((a, i) => (
                <span
                  key={`${a.name}-${i}`}
                  className="inline-flex items-center gap-1 rounded-md border border-ac-light-gray bg-ac-warm-white px-2 py-0.5 font-mono text-[10.5px] text-ac-dark-secondary"
                >
                  {a.name}
                  <button type="button" onClick={() => chat.removeAttachment(i)} className="text-ac-med-gray hover:text-ac-dark">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {chat.attachError && <div className="mb-2 font-mono text-[11px] text-ac-coral-dark">{chat.attachError}</div>}
          <div className="relative">
            <button
              type="button"
              onClick={() => fileRef.current && fileRef.current.click()}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ac-med-gray transition-colors hover:text-ac-dark"
              title="Attach a file"
            >
              <Paperclip size={16} />
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.json,.txt,.md,.csv"
              className="hidden"
              onChange={(e) => {
                chat.addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              type="text"
              value={chat.input}
              onChange={(e) => chat.setInput(e.target.value)}
              placeholder="Ask, or describe a workflow to build…"
              className="w-full rounded-xl border border-ac-light-gray bg-ac-warm-white py-2.5 pl-9 pr-12 text-sm text-ac-dark outline-none transition-colors focus:border-ac-coral focus:bg-ac-cream"
            />
            <button
              type="submit"
              disabled={(!chat.input.trim() && chat.attachments.length === 0) || chat.pending}
              className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-lg bg-white p-2 text-ac-ink disabled:opacity-40"
            >
              <ArrowUp size={15} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update `GlobalAssistant.jsx` — merged lookup, hide on `/`, drop surface**

Full replacement:

```jsx
// web/src/components/GlobalAssistant.jsx
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AssistantWidget } from './AssistantWidget';
import { useData } from '../lib/useData';

// Page-relevant context + suggestions per route. The Librarian brain is the
// same everywhere (surface: platform); only the framing changes.
function deriveContext(pathname) {
  if (pathname.startsWith('/signals/')) {
    const id = decodeURIComponent(pathname.slice('/signals/'.length));
    return {
      pageContext: `The user is on the signal (skill) detail page for "${id}". Prefer answering about this signal — what it does, how to deploy it, and how to adapt it.`,
      suggestions: ['What does this signal do?', 'How do I deploy it?', 'Build a variant of this signal'],
    };
  }
  if (pathname === '/signals') {
    return {
      pageContext: 'The user is browsing the Signals catalog (packaged AI-assistant skills).',
      suggestions: ['What is a signal?', 'Find an account-planning signal', 'What helps with MEDDPICC?'],
    };
  }
  if (pathname === '/mcp') {
    return {
      pageContext:
        'The user is on the MCP Capabilities page. Focus on the Backstory MCP — what it is, what each tool does, and how workflows and signals use it to fetch live account/deal data.',
      suggestions: ['What can the Backstory MCP do?', 'What does ask_sales_ai_about_account do?', 'Which workflows use find_account?'],
    };
  }
  if (pathname.startsWith('/workflow/')) {
    const id = decodeURIComponent(pathname.slice('/workflow/'.length));
    return {
      pageContext: `The user is on the workflow detail page for "${id}". Prefer answering about this workflow — its platforms, setup, downloads, and how to adapt it.`,
      suggestions: ['How do I deploy this workflow?', 'Which platforms support it?', 'Build a variant of this'],
    };
  }
  if (pathname === '/flows') {
    return {
      pageContext: 'The user is browsing the Auto flows catalog (scheduled automation workflows).',
      suggestions: ['What is an Auto flow?', 'Find a renewal-risk workflow', 'How does a workflow use the MCP?'],
    };
  }
  if (pathname.startsWith('/api-docs')) {
    return {
      pageContext:
        'The user is reading the Backstory API docs (read-only REST + Query API at api.people.ai). Help with authentication, endpoints, pagination, the data model, and errors.',
      suggestions: ['How do I authenticate?', 'How does pagination work?', 'Which endpoint returns engagement?'],
    };
  }
  if (pathname.startsWith('/guides')) {
    return {
      pageContext: 'The user is reading the Setup Guides (Slack, Teams, email, Google Chat, cross-tool, Backstory MCP).',
      suggestions: ['How do I set up the Slack bot?', 'What does the MCP guide cover?', 'Which guide do I need for email delivery?'],
    };
  }
  if (pathname === '/about') {
    return {
      pageContext: 'The user is on the About page for the Backstory Automation Library.',
      suggestions: ['What is the Automation Library?', 'How are workflows packaged?', 'Find a workflow for me'],
    };
  }
  return {
    pageContext: 'The user is browsing the Backstory Automation Library.',
    suggestions: ['Find a renewal-risk workflow', 'Build a Slack alert for stuck deals', 'What helps with pipeline forecasting?'],
  };
}

export function GlobalAssistant() {
  const { pathname } = useLocation();
  const { data: wf } = useData('workflows.json');
  const { data: sk } = useData('skills.json');

  const ctx = useMemo(() => deriveContext(pathname), [pathname]);
  const lookup = useMemo(() => {
    const m = {};
    (wf?.workflows || []).forEach((x) => (m[x.id] = { name: x.name, category: x.category, kind: 'workflow' }));
    (sk?.skills || []).forEach((x) => (m[x.id] = { name: x.name, category: x.category, kind: 'signal' }));
    return m;
  }, [wf, sk]);

  // The home page IS the Librarian — no floating widget there.
  if (pathname === '/') return null;

  return <AssistantWidget suggestions={ctx.suggestions} lookup={lookup} pageContext={ctx.pageContext} />;
}
```

- [ ] **Step 4: Update `MessageList.jsx` — kind-based links, drop the surface prop**

Full replacement:

```jsx
// web/src/components/assistant/MessageList.jsx
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { DraftCard } from './DraftCard';
import { ArtifactCard } from './ArtifactCard';
import { MarketplaceCapture } from './MarketplaceCapture';

function RecCard({ id, lookup }) {
  const meta = lookup[id] || {};
  const to = meta.kind === 'signal' ? `/signals/${id}` : `/workflow/${id}`;
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-3 rounded-lg border border-ac-light-gray bg-ac-warm-white px-3 py-2 no-underline transition-colors hover:border-ac-coral"
    >
      <span className="text-[13px] font-medium text-ac-dark">{meta.name || id}</span>
      <ArrowRight size={13} className="text-ac-med-gray transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function MessageList({ turns, pending, lookup }) {
  return (
    <div className="flex flex-col gap-4">
      {turns.map((t, i) =>
        t.role === 'user' ? (
          <div key={i} className="self-end rounded-xl bg-white px-3.5 py-2 text-[13.5px] text-ac-ink">{t.content}</div>
        ) : (
          <div key={i} className="max-w-full self-start">
            <p className="text-[13.5px] leading-6 text-ac-dark-secondary">{t.content}</p>
            {t.recommendations && t.recommendations.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                {t.recommendations.map((id) => (
                  <RecCard key={id} id={id} lookup={lookup} />
                ))}
              </div>
            )}
            {t.artifact && <ArtifactCard artifact={t.artifact} />}
            {!t.artifact && t.draft && <DraftCard draft={t.draft} />}
            {(t.artifact || t.draft) && <MarketplaceCapture surface="platform" draft={t.draft} artifact={t.artifact} />}
          </div>
        ),
      )}
      {pending && (
        <div className="inline-flex items-center gap-2 self-start text-[13px] text-ac-med-gray">
          <Loader2 size={14} className="animate-spin" /> Thinking…
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Wrap the app in the provider (`Layout.jsx`)**

```jsx
// web/src/components/Layout.jsx
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TooltipProvider } from './ui/Tooltip';
import { Header } from './Header';
import { GlobalAssistant } from './GlobalAssistant';
import { ChatProvider } from '../lib/chatStore';

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <TooltipProvider>
      <ChatProvider>
        <Header />
        <main>
          <Outlet />
        </main>
        <GlobalAssistant />
      </ChatProvider>
    </TooltipProvider>
  );
}
```

- [ ] **Step 6: Verify — tests + build**

Run: `npm test`
Expected: PASS (no component tests exist; lib/api suites green).

Run: `npm run build`
Expected: vite build succeeds with no unresolved imports (catches JSX/import errors in the rewired components).

- [ ] **Step 7: Commit**

```bash
git add src/lib/chatStore.jsx src/components/AssistantWidget.jsx src/components/GlobalAssistant.jsx src/components/assistant/MessageList.jsx src/components/Layout.jsx
git commit -m "feat: shared Librarian chat store — widget and page are two skins over one conversation

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: AssistantHome page, routes, library card

**Files:**
- Create: `web/src/pages/AssistantHome.jsx`
- Modify: `web/src/App.jsx` (routes: `/` → AssistantHome, `/library` → Landing)
- Modify: `web/src/pages/Landing.jsx` (prepend "Ask the Librarian" card)

**Interfaces:**
- Consumes: `useAssistantChat` (Task 8), `timeGreeting` (Task 1), `MessageList`/`BuilderPanel` (existing), `buildPrompt` (existing), `useData` (existing).
- Produces: the `/` route experience; `/library` hosting the old landing.

- [ ] **Step 1: Create the page**

```jsx
// web/src/pages/AssistantHome.jsx
// The Librarian's home — the site's front door. Gemini-style: a greeting and
// one big composer; after the first message it becomes a focused thread.
import { useEffect, useMemo, useRef } from 'react';
import { Paperclip, Wrench, ArrowUp, SquarePen, X } from 'lucide-react';
import { useAssistantChat } from '../lib/chatStore';
import { timeGreeting } from '../lib/greeting';
import { buildPrompt } from '../lib/assistant';
import { useData } from '../lib/useData';
import { MessageList } from '../components/assistant/MessageList';
import { BuilderPanel } from '../components/assistant/BuilderPanel';

const HOME_CONTEXT =
  "The user is on the Librarian home page — the assistant's dedicated page for the whole library. They may ask about anything on the site (Auto flows, Signals, MCP capabilities, API docs, setup guides), want a workflow built, or want to talk through automation strategy. Questions often arrive fuzzy — interpret the underlying need and guide them to concrete use cases.";

const CHIPS = [
  'Could we use Backstory to better understand discovery?',
  'What can the Backstory MCP do?',
  'Build a Slack alert for stuck deals',
  'Talk through my automation roadmap',
  'How do I set up the Slack integration?',
];

function Composer({ chat, autoFocus = false }) {
  const taRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (autoFocus && taRef.current) taRef.current.focus();
  }, [autoFocus]);

  function resize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  function submit() {
    chat.ask(chat.input, { pageContext: HOME_CONTEXT });
    if (taRef.current) taRef.current.style.height = 'auto';
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-2xl border border-ac-light-gray bg-ac-card p-3 shadow-card transition-colors focus-within:border-ac-coral"
    >
      {chat.attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chat.attachments.map((a, i) => (
            <span
              key={`${a.name}-${i}`}
              className="inline-flex items-center gap-1 rounded-md border border-ac-light-gray bg-ac-warm-white px-2 py-0.5 font-mono text-[10.5px] text-ac-dark-secondary"
            >
              {a.name}
              <button type="button" onClick={() => chat.removeAttachment(i)} className="text-ac-med-gray hover:text-ac-dark">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      {chat.attachError && <div className="mb-2 font-mono text-[11px] text-ac-coral-dark">{chat.attachError}</div>}
      <textarea
        ref={taRef}
        rows={1}
        value={chat.input}
        onChange={(e) => {
          chat.setInput(e.target.value);
          resize();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask the Librarian, or describe a workflow to build…"
        className="max-h-[200px] w-full resize-none bg-transparent px-2 pt-1.5 text-[15px] leading-6 text-ac-dark placeholder:text-ac-med-gray focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileRef.current && fileRef.current.click()}
            title="Attach a file"
            className="grid h-9 w-9 place-items-center rounded-lg text-ac-med-gray transition-colors hover:bg-ac-cream hover:text-ac-dark"
          >
            <Paperclip size={17} />
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.json,.txt,.md,.csv"
            className="hidden"
            onChange={(e) => {
              chat.addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => chat.setMode('builder')}
            title="Build a workflow"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ac-med-gray transition-colors hover:bg-ac-cream hover:text-ac-dark"
          >
            <Wrench size={14} /> Build
          </button>
        </div>
        <button
          type="submit"
          disabled={(!chat.input.trim() && chat.attachments.length === 0) || chat.pending}
          className="grid h-9 w-9 place-items-center rounded-full bg-white text-ac-ink transition-opacity disabled:opacity-40"
          aria-label="Send"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </form>
  );
}

export function AssistantHome() {
  const chat = useAssistantChat();
  const { data: wf } = useData('workflows.json');
  const { data: sk } = useData('skills.json');

  const lookup = useMemo(() => {
    const m = {};
    (wf?.workflows || []).forEach((x) => (m[x.id] = { name: x.name, category: x.category, kind: 'workflow' }));
    (sk?.skills || []).forEach((x) => (m[x.id] = { name: x.name, category: x.category, kind: 'signal' }));
    return m;
  }, [wf, sk]);

  function handleBuild(spec) {
    chat.setMode('chat');
    chat.ask(buildPrompt(spec), { pageContext: HOME_CONTEXT });
  }

  const empty = chat.turns.length === 0;

  if (empty) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-5 pb-24 pt-[14vh] animate-fade-up">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ac-med-gray">
          /// {timeGreeting(new Date().getHours())}
        </div>
        <h1 className="mt-2 font-display text-[clamp(26px,4.5vw,40px)] font-bold tracking-[-0.02em] text-ac-dark">
          Let's get some work done.
        </h1>
        <div className="mt-8">
          {chat.mode === 'builder' ? (
            <div className="rounded-2xl border border-ac-light-gray bg-ac-card p-5">
              <BuilderPanel surface="platform" onBuild={handleBuild} onCancel={() => chat.setMode('chat')} />
            </div>
          ) : (
            <>
              <Composer chat={chat} autoFocus />
              <div className="mt-4 flex flex-wrap gap-2">
                {CHIPS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => chat.ask(s, { pageContext: HOME_CONTEXT })}
                    className="rounded-full border border-ac-light-gray bg-ac-card px-3.5 py-1.5 font-mono text-[11.5px] text-ac-dark-secondary transition-colors hover:border-ac-coral hover:text-ac-coral-dark"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-5">
      <div className="sticky top-[110px] z-10 -mx-5 flex items-center justify-between bg-gradient-to-b from-black via-black/95 to-transparent px-5 pb-4 pt-4 sm:top-[74px]">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ac-med-gray">/// Librarian</div>
        <button
          type="button"
          onClick={chat.resetChat}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-ac-med-gray transition-colors hover:bg-ac-cream hover:text-ac-dark"
        >
          <SquarePen size={13} /> New chat
        </button>
      </div>

      <div className="pb-44 pt-2">
        {chat.mode === 'builder' ? (
          <div className="rounded-2xl border border-ac-light-gray bg-ac-card p-5">
            <BuilderPanel surface="platform" onBuild={handleBuild} onCancel={() => chat.setMode('chat')} />
          </div>
        ) : (
          <MessageList turns={chat.turns} pending={chat.pending} lookup={lookup} />
        )}
      </div>

      {chat.mode !== 'builder' && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/95 to-transparent pb-5 pt-10">
          <div className="mx-auto w-full max-w-[760px] px-5">
            <Composer chat={chat} />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update routes in `App.jsx`**

Add the import and change the two routes (leave everything else, including `LegacyEmbed`, untouched):

```jsx
import { AssistantHome } from './pages/AssistantHome';
```

```jsx
          <Route path="/" element={<AssistantHome />} />
          <Route path="/library" element={<Landing />} />
```

- [ ] **Step 3: Prepend the Librarian card in `Landing.jsx`**

Add to the top of the `SECTIONS` array:

```jsx
  {
    to: '/',
    title: 'Ask the Librarian',
    description: 'The AI brain of the platform — ask anything, build workflows, talk strategy.',
    eyebrow: 'Assistant',
  },
```

- [ ] **Step 4: Verify — tests + build**

Run: `npm test && npm run build`
Expected: both PASS.

- [ ] **Step 5: Smoke-check the routes render**

Run: `npm run preview &` then `curl -s http://localhost:4173/ | grep -o '<div id="root"></div>'` and kill the preview server.
Expected: the shell HTML serves (hash-routing means both `/#/` and `/#/library` resolve client-side; full visual check happens in Task 11).

- [ ] **Step 6: Commit**

```bash
git add src/pages/AssistantHome.jsx src/App.jsx src/pages/Landing.jsx
git commit -m "feat: Librarian home page at / — greeting, composer, thread; landing moves to /library

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Hamburger navigation

**Files:**
- Create: `web/src/components/HamburgerMenu.jsx`
- Modify: `web/src/components/Header.jsx` (remove inline nav, mount the menu)

**Interfaces:**
- Consumes: `@radix-ui/react-dialog` (already a dependency), `cn` from `web/src/lib/cn.js`.
- Produces: `<HamburgerMenu />` used only by `Header`.

- [ ] **Step 1: Create the menu**

```jsx
// web/src/components/HamburgerMenu.jsx
// All navigation lives here now — a right-side sheet at every viewport size.
// Radix Dialog supplies focus trap, Escape-to-close, and overlay dismissal.
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import * as RD from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';
import { cn } from '../lib/cn';

const ITEMS = [
  { to: '/', label: 'Assistant' },
  { to: '/library', label: 'Browse the library' },
  { to: '/flows', label: 'Auto flows' },
  { to: '/signals', label: 'Signals' },
  { to: '/mcp', label: 'MCP Capabilities' },
  { to: '/api-docs', label: 'API Docs' },
  { to: '/guides', label: 'Setup Guides' },
  { to: '/about', label: 'About' },
];

export function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Close when navigation happens (NavLink click changes the route).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <RD.Root open={open} onOpenChange={setOpen}>
      <RD.Trigger
        className="grid h-10 w-10 place-items-center rounded-[10px] text-ac-dark transition-colors hover:bg-ac-cream"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </RD.Trigger>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-overlay-in" />
        <RD.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-ac-light-gray bg-ac-ink p-6 shadow-menu animate-fade-in sm:w-[320px]"
        >
          <div className="flex items-center justify-between">
            <RD.Title className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ac-med-gray">
              /// Menu
            </RD.Title>
            <RD.Close
              className="grid h-9 w-9 place-items-center rounded-lg text-ac-med-gray transition-colors hover:bg-ac-cream hover:text-ac-dark"
              aria-label="Close menu"
            >
              <X size={18} />
            </RD.Close>
          </div>
          <nav aria-label="Primary" className="mt-6 flex flex-col gap-1">
            {ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-[10px] px-3 py-2.5 font-mono text-[13px] font-medium no-underline transition-colors',
                    isActive ? 'bg-ac-coral/15 text-ac-coral-dark' : 'text-ac-dark hover:bg-ac-cream hover:text-ac-coral-dark',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
```

- [ ] **Step 2: Slim the header**

Full replacement of `web/src/components/Header.jsx`:

```jsx
// web/src/components/Header.jsx
import { Link } from 'react-router-dom';
import { assetUrl } from '../lib/cn';
import { HamburgerMenu } from './HamburgerMenu';

export function Header() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ac-light-gray bg-ac-ink/95 px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur sm:px-8">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex-shrink-0">
          <img
            src={assetUrl('assets/backstory-logo-lockup-white.png')}
            alt="Backstory"
            className="h-[42px] w-auto object-contain"
          />
        </Link>
        <div className="hidden h-8 w-px bg-ac-coral/25 sm:block" />
        <div className="hidden text-[13px] text-ac-dark-secondary sm:block">
          Automations, signals &amp; MCP capabilities powered by Backstory
        </div>
      </div>
      <HamburgerMenu />
    </header>
  );
}
```

Note: the header is now a single row at every size, so the thread view's sticky offset in `AssistantHome` (`top-[110px] sm:top-[74px]`) should be simplified to `top-[74px]` — update that class in `web/src/pages/AssistantHome.jsx` in this step.

- [ ] **Step 3: Verify — tests + build**

Run: `npm test && npm run build`
Expected: both PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/HamburgerMenu.jsx src/components/Header.jsx src/pages/AssistantHome.jsx
git commit -m "feat: hamburger navigation — all pages in a right-side sheet at every viewport

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: End-to-end verification + docs touch-up

**Files:**
- Modify (only if stale): `web/README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: verified feature; updated docs.

- [ ] **Step 1: Full suite + production build**

Run: `npm test && npm run build`
Expected: all tests PASS; build succeeds. Note the count of knowledge chunks in the sync-data output line.

- [ ] **Step 2: Drive the app end-to-end (offline chat path)**

Run `npm run dev` in the background, then check with a browser or curl that the app serves. Without `ANTHROPIC_API_KEY` in the environment, `/api/*` doesn't exist under plain vite — the expected behavior is the widget/page error fallback reply ("The assistant is unavailable right now…"). If `vercel dev` and a key are available, prefer it and verify a real reply that references retrieved guide content (e.g. ask "How do I set up the Slack bot?" and check the answer mentions bot tokens/scopes from the guide).

Manual checklist (in the browser):
- `/#/` shows the greeting (correct time-of-day wording), headline, composer, 5 chips; no floating Ask AI button.
- Typing a message transitions to the thread view; the composer docks at the bottom; "New chat" resets and survives a refresh check (send → refresh → conversation still there; New chat → refresh → empty).
- Builder: wrench opens the panel; "Draft it" fires a chat turn (offline fallback reply is fine locally).
- `/#/library` shows the section cards, including "Ask the Librarian" first.
- Every page except `/#/` shows the floating widget; its expand icon lands on `/#/` with the same conversation visible.
- Hamburger: opens on desktop and mobile widths, lists all 8 items, active item highlighted, closes on selection/Escape/overlay click.
- `/#/guides` and `/#/api-docs` still render (no header/nav regression).

- [ ] **Step 3: Update `web/README.md` if it describes the old nav/routes**

Read `web/README.md`; if it lists routes or describes the top navigation / assistant widget, update those sections to: `/` = Librarian assistant home, `/library` = catalogue landing, nav via hamburger, assistant = shared conversation (widget + page). Keep it to a few lines of diff — do not rewrite the file.

- [ ] **Step 4: Commit any doc changes and mark the plan done**

```bash
git add -A docs/superpowers/plans/2026-07-02-librarian-assistant-home.md web/README.md
git commit -m "docs: verification pass + README refresh for the Librarian home + hamburger nav

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-Review (completed)

- **Spec coverage:** §1 IA/nav → Tasks 9, 10; §2 page UI → Task 9; §3 shared state/persistence → Tasks 2, 8; §4.1 index → Tasks 3–5; §4.2 retrieval → Task 6; §4.3 prompt/API → Task 7; §5 error handling → Tasks 2, 5, 6, 7 (fail-open paths); §6 testing → every task + Task 11; §7 out-of-scope respected (no streaming, no history sidebar, no name capture, legacy untouched).
- **Placeholder scan:** no TBD/TODO; every code step contains complete code; the one intentional wording change to the shared output contract is called out explicitly in Task 7 Step 3b.
- **Type consistency:** `Chunk {id,type,title,text,keywords}` used in Tasks 3–7; `useAssistantChat` surface identical between Task 8 (producer) and Task 9 (consumer); `lookup[id] = {name, category, kind}` identical in Tasks 8 and 9; `buildSystemPrompt(surface, persona, pageContext, retrievedBlock)` 4-arg form consistent across Task 7 code and tests.
