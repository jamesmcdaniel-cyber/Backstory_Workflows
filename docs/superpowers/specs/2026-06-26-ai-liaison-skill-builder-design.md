# Stream 1 — AI Liaison + Skill Builder

**Date:** 2026-06-26
**Status:** Design — awaiting user review
**Part of:** [Alive Catalogue Roadmap](./2026-06-26-alive-catalogue-roadmap.md)

## 1. Summary

Replace the search bar on the Catalog and Skills pages with a conversational **"ask" bar**
backed by Claude. The assistant acts as a **liaison** that (a) **finds** existing
workflows/skills, (b) helps **build** new ones when nothing fits, and (c) **submits** drafts
to an External Marketplace (a labeled GitHub issue) for review into the main catalogue — which
is also how we capture demand signal to strengthen the catalogue.

The same `web/` Vite app gains a Vercel deployment with two serverless functions
(`/api/chat`, `/api/submit`). GitHub Pages behavior is unchanged.

## 2. Goals / Non-Goals

**Goals**
- One shared `<Assistant surface="workflows|skills" />` powering both pages.
- Live local filtering preserved (type → grid filters instantly, no API cost).
- Enter / "Ask" opens an inline chat panel: find → build → submit.
- Real Claude via a server-side key on Vercel; key never reaches the browser.
- Submissions become GitHub issues labeled for triage into `workflows.json` / `skills.json`.
- Assistant reads a global persona if present (Stream 2 sets it; here it's optional) and
  speaks with a distinct, confident voice.

**Non-Goals (this stream)**
- Streaming responses (typing indicator only; streaming is a later polish).
- Auth, accounts, rate limiting beyond a basic origin/method check.
- Persona UI/switcher (Stream 2).
- Re-porting legacy `index.html` pages still marked placeholder.
- Trending/most-viewed counters (Stream 4).

## 3. Architecture

Single codebase, adapted in place:

```
web/
├── src/
│   ├── components/
│   │   ├── Assistant.jsx        NEW  ask-bar + chat panel (one component, both pages)
│   │   └── assistant/
│   │       ├── MessageList.jsx  NEW  renders turns, recommend cards, draft preview
│   │       └── DraftCard.jsx    NEW  submission preview + "Submit to marketplace"
│   ├── lib/
│   │   └── assistant.js         NEW  fetch wrappers (chat/submit) + message reducer
│   ├── pages/Catalog.jsx        EDIT replace <input> block with <Assistant surface="workflows">
│   └── pages/Skills.jsx         EDIT replace <input> block with <Assistant surface="skills">
├── api/
│   ├── chat.js                  NEW  Claude proxy (catalog context + tool-use)
│   ├── submit.js                NEW  create GitHub issue
│   ├── _anthropic.js            NEW  shared: build messages, call Anthropic, parse tools
│   └── _catalog-index.json      NEW  generated compact index (committed via sync-data)
├── vercel.json                  NEW  framework + SPA fallback + function runtime
└── vite.config.js               EDIT env-driven base path
scripts/sync-data.mjs            EDIT also emit web/api/_catalog-index.json
.env.example                     NEW  documents required env vars
web/README.md                    EDIT add Vercel deploy + env section
```

Routing stays **HashRouter** — works identically on Pages and Vercel, no rewrite rules needed
for app routes. `vercel.json` only needs the SPA fallback for safety and the functions live
under `/api/*` automatically.

### 3.1 Build / base path

`vite.config.js` reads the base from env so the same source serves both hosts:

```js
// Pages serves under /Backstory_Workflows/; Vercel serves at root.
const base = process.env.VITE_BASE ?? (process.env.VERCEL ? '/' : '/Backstory_Workflows/');
export default defineConfig({ plugins: [react()], base });
```

Pages (the existing `deploy-web.yml`) sets nothing → keeps `/Backstory_Workflows/`. Vercel sets
`VERCEL=1` automatically → `/`. No change to the Pages pipeline.

### 3.2 Vercel project settings (documented, not code)

- **Root Directory:** `web` (so `web/api/*` are the functions and `web/dist` is the output).
- **Framework preset:** Vite (auto). Build runs `prebuild → sync-data → build`.
- **Env vars:** see §6.

## 4. Serverless functions

### 4.1 `/api/chat` — the liaison

`POST { surface: 'workflows'|'skills', messages: [{role, content}] }`

Flow:
1. Validate method/origin; reject if `ANTHROPIC_API_KEY` missing (return a friendly error the
   UI shows inline).
2. Load `_catalog-index.json` for the surface → a compact list of
   `{ id, name, category, description, status }` (38 workflows / 30 skills — small enough to
   inline in the system prompt; no RAG needed).
3. Build the system prompt: role + voice + persona (if passed) + the catalogue index +
   tool instructions + submission rules.
4. Call Anthropic Messages API with two tools (§4.3). Model from `ANTHROPIC_MODEL`
   (default `claude-sonnet-4-6`), `max_tokens` ~1024.
5. Return `{ reply, recommendations: [...ids], draft: {...}|null }` derived from the model's
   text + tool calls. Non-streaming.

Exact SDK choice (raw `fetch` to `https://api.anthropic.com/v1/messages` with `x-api-key` +
`anthropic-version` header, vs `@anthropic-ai/sdk`) and tool-result handling will be confirmed
against the **claude-api reference** during implementation. Default plan: raw `fetch`, zero
extra deps.

### 4.2 `/api/submit` — the External Marketplace

`POST { surface, draft: { title, summary, stack, spec, requester? } }`

- Requires `GITHUB_TOKEN` (repo scope) + `GITHUB_REPO` (default
  `JamesMcDaniel04/Backstory_Workflows`).
- Creates an issue via `POST /repos/{repo}/issues`:
  - **title:** `[Marketplace] <draft.title>`
  - **labels:** `marketplace-submission`, `workflow` or `skill`
  - **body:** rendered markdown (summary, intended tech stack, drafted spec, source = which
    surface/persona).
- Returns `{ url }`; the assistant links it ("Filed to the marketplace → #123").
- On missing token, return a graceful error and (fallback) a `mailto:`/prefilled-issue URL the
  UI can offer, so the demo still works without the token.

### 4.3 Tools given to Claude

- `recommend(ids: string[])` — surface IDs the user should look at. Client renders them as the
  existing workflow/skill cards (links to `/workflow/:id` or `/skills/:id`).
- `draft_submission(draft: { title, summary, stack, spec })` — a structured new-entry draft.
  Client renders a **DraftCard** preview with an explicit **"Submit to marketplace"** button.
  Submission is always user-confirmed; the model never auto-submits.

## 5. Frontend behavior

### 5.1 `<Assistant surface>` — replaces the search `<input>`

- Renders the same dark, rounded input shell as today (design-system match), with a subtle
  `///` mark and persona-aware placeholder (e.g. "Ask for a workflow, or describe one to
  build…").
- **As you type:** debounced local filter over the loaded `workflows.json`/`skills.json`
  (exactly today's `filter` logic) → the grid narrows live. Zero API calls.
- **On Enter / Ask:** expands an inline chat panel below the bar (not a floating bubble) and
  sends the turn to `/api/chat`. The page grid stays; the panel overlays/pushes beneath the bar.
- Suggested prompt chips when empty (e.g. "Find a renewal-risk workflow", "Build a Slack deal
  alert", persona-tailored).

### 5.2 Chat panel

- `MessageList` renders user/assistant turns. Assistant turns may include:
  - inline **recommendation cards** (reuse `WorkflowCard`/`SkillCard` styling) → click navigates.
  - a **DraftCard** with summary + spec + "Submit to marketplace" → calls `/api/submit`,
    then shows the issue link inline.
- Typing indicator while awaiting `/api/chat`. Errors render inline (e.g. "assistant is offline
  — key not set"), never a blank state.
- State is local to the page (resets on navigation). No persistence in this stream.

### 5.3 Voice / persona

- System prompt gives the assistant a confident, lightly opinionated liaison voice — recommends
  decisively, names trade-offs, never reads like API docs.
- If a persona is present in `localStorage` (`backstory.persona`, set by Stream 2), it's passed
  to `/api/chat` and steers tone + what to lead with. Absent → a neutral-but-warm default.

## 6. Configuration (Vercel env vars)

| Var | Required | Default | Purpose |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | — | Server-side Claude key |
| `ANTHROPIC_MODEL` | no | `claude-sonnet-4-6` | Chat model (flip to `claude-opus-4-8`) |
| `GITHUB_TOKEN` | for submissions | — | Repo-scoped token to open issues |
| `GITHUB_REPO` | no | `JamesMcDaniel04/Backstory_Workflows` | `owner/repo` for issues |
| `ALLOWED_ORIGIN` | no | request origin | Basic CORS/origin allowlist |

All documented in `.env.example` + `web/README.md`. None of these affect the Pages build.

## 7. Data plumbing

`scripts/sync-data.mjs` (already copies JSON → `web/public/`) additionally emits
`web/api/_catalog-index.json` = `{ workflows: [...], skills: [...] }` with only
`{ id, name, category, description, status }` per item, so the function bundle ships a small,
import-friendly index (no runtime file reads from `public/`). Runs in `predev`/`prebuild`, so
it's fresh for both dev and every Vercel build. The generated file is git-ignored or committed
(decide in plan; committing keeps Vercel builds hermetic).

## 8. Error handling

- Missing `ANTHROPIC_API_KEY` → `/api/chat` returns 200 with `{ reply: "<offline notice>" }`
  so the UI degrades to plain local search (never crashes).
- Anthropic call failure/timeout → inline retry affordance.
- Missing `GITHUB_TOKEN` → `/api/submit` returns a prefilled-issue URL fallback.
- All functions validate method (`POST`) and basic origin; reject otherwise.

## 9. Testing

- **Unit:** `assistant.js` reducer (append turn, attach recommendations/draft); `_anthropic.js`
  tool-parse (given a mock Anthropic response → `{ reply, recommendations, draft }`); `submit`
  body rendering.
- **Function-level:** chat handler with a mocked Anthropic fetch (asserts system prompt includes
  catalogue index + persona; parses tool calls). Submit handler with a mocked GitHub fetch.
- **Manual:** `vercel dev` locally with a real key — find, build, submit round-trip; confirm
  Pages build (`npm run build` in `web/` with no `VERCEL`) still emits base `/Backstory_Workflows/`.

## 10. Build sequence (for the plan)

1. Vercel-deployability: `vite.config.js` base env, `vercel.json`, `.env.example`, README.
2. `sync-data.mjs` → emit `_catalog-index.json`.
3. `api/_anthropic.js` + `api/chat.js` (mockable, tested).
4. `api/submit.js` (mockable, tested).
5. `lib/assistant.js` + `Assistant.jsx` + sub-components.
6. Wire into `Catalog.jsx` and `Skills.jsx` (preserve local filter).
7. Manual round-trip + Pages-parity check.
