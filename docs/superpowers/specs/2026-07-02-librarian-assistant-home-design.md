# Backstory Librarian — assistant home page, full-site brain, hamburger nav

**Date:** 2026-07-02
**Status:** Approved
**Scope:** React app (`web/`) + Vercel API (`web/api/`) only. The legacy single-file site (root `index.html`) is untouched.

## Summary

The AI assistant gets its own dedicated page — and that page becomes the site's home (`/`). Modeled on the Gemini home screen (greeting + one big composer, generous whitespace), rendered in the existing dark design system (JetBrains Mono structural type, white accent, `///` signature). The assistant becomes the **librarian/brain of the platform**: it knows everything published on the site (workflows, signals, MCP tools, API docs, setup guides), helps build workflows (existing artifact machinery), and talks through automation strategy. Top navigation collapses into a hamburger menu at all viewport sizes.

## Decisions (locked with James, 2026-07-02)

1. **Knowledge:** build-time index of the full site + live retrieval per turn.
2. **Retrieval:** keyword-scored (BM25-lite) chunk selection in the chat function. No embeddings, no tool-use loop, one LLM call per turn.
3. **Placement:** the assistant page IS the home page (`/`). The current landing moves to `/library`.
4. **Widget:** the floating "Ask AI" widget stays on all pages except `/`, shares the same brain and the same conversation, and gains an expand-to-page control.
5. **Greeting:** time-based ("Good morning / afternoon / evening"), no name capture.
6. **Persistence:** the single active conversation persists locally; "New chat" clears it. No multi-chat history UI.
7. **Navigation:** all pages move into a hamburger menu (React app only).

## 1. Information architecture & navigation

Routes (`web/src/App.jsx`):

| Route | Page | Change |
|---|---|---|
| `/` | **AssistantHome** (new) | was Landing |
| `/library` | Landing (section cards) | moved; gains an "Ask the Librarian" card linking to `/` |
| `/flows`, `/workflow/:id`, `/signals`, `/signals/:id`, `/mcp`, `/about`, `/api-docs/*`, `/guides/*` | unchanged | — |

Header (`web/src/components/Header.jsx`):
- Left: logo (links to `/`) + tagline (tagline hidden on mobile).
- Right: a single hamburger button (all viewport sizes). Inline nav links removed.
- Hamburger opens a slide-in panel (right side; full-screen sheet on mobile) with an overlay. Items in order: Assistant, Browse the library, Auto flows, Signals, MCP Capabilities, API Docs, Setup Guides, About. Styling: existing tokens — `bg-ac-ink`/`bg-ac-card`, `border-ac-light-gray`, JetBrains Mono uppercase labels, active state per existing NavLink pattern. Panel closes on route change, overlay click, and Escape; focus is trapped while open.

Widget (`web/src/components/GlobalAssistant.jsx` / `AssistantWidget.jsx`):
- Hidden on `/` (the page is the assistant there).
- Header gains an expand icon (Maximize2) → navigates to `/`; the conversation carries over automatically via the shared store.
- Keeps its per-page `pageContext` + suggestions behavior.

## 2. AssistantHome page UI (`web/src/pages/AssistantHome.jsx`)

Centered column, `max-w` ~720px, sitting in the upper third of the viewport.

**Empty state (no turns):**
- Eyebrow: `/// GOOD MORNING` (time-based: morning < 12:00, afternoon < 18:00, evening otherwise; computed from local time by a small pure util).
- Headline (display type): "Let's get some work done."
- Composer card: rounded-2xl, `bg-ac-card`, `border-ac-light-gray`. Auto-growing textarea (Enter submits, Shift+Enter newline). Bottom row: paperclip button (existing attachment pipeline: 4 files max, 3MB, image/pdf/text) and wrench button (opens the existing `BuilderPanel` inline, replacing the composer until Build/Cancel); white send pill (ArrowUp) on the right, disabled while empty/pending. No model selector.
- Suggestion chips (5) covering the librarian's range: find ("Which flows help with renewal risk?"), understand ("What can the Backstory MCP do?"), build ("Build a Slack alert for stuck deals"), strategy ("Talk through my automation roadmap"), guides ("How do I set up the Slack integration?").

**Thread state (≥1 turn):**
- Greeting collapses to a compact row: `/// LIBRARIAN` + a "New chat" button (SquarePen, existing pattern).
- `MessageList` (existing component, reused) fills the column: markdown-ish text replies, recommendation cards, `DraftCard` (marketplace submit), `ArtifactCard` (download).
- Composer docks sticky at the bottom of the viewport, same column width.
- Transition home→thread is a simple state change; no animation work beyond a fade/translate if trivial.

Attachments UI, error strings, and pending indicator reuse the widget's existing patterns.

## 3. Shared chat state (`web/src/lib/chatStore.jsx`)

Extract chat logic from `AssistantWidget` into an app-level provider + `useAssistantChat()` hook:

- State: `turns`, `pending`, `input`, `attachments`, `attachError`, `mode` (`chat` | `builder`).
- Actions: `ask(text, atts)`, `resetChat()`, `addFiles(fileList)`, `removeAttachment(i)`, `setMode`.
- `ask()` behavior is the current widget logic (append user turn, `sendChat`, append assistant turn, error fallback reply), with one change: **surface is always `platform`** and `pageContext` comes from the caller (route-derived for the widget, "Librarian home" for the page).
- Persistence: `turns` saved to `localStorage['backstory.chat.v1']` (JSON), restored on provider mount, capped at the last 40 turns; all storage access wrapped in try/catch (quota/JSON failures degrade to in-memory).
- Request payload caps: send only the last 20 messages to the API.
- `AssistantWidget` and `AssistantHome` both consume the hook — two skins, one conversation.

`GlobalAssistant`'s per-route `deriveContext()` stays (pageContext + suggestions), but the `surface` split ('workflows' | 'skills') is retired in favor of `platform` everywhere; the recommendation `lookup` becomes a merged map (see §4).

## 4. Backend — knowledge index, retrieval, librarian prompt

### 4.1 Knowledge index (build time)

`web/scripts/sync-data.mjs` (or a `build-knowledge.mjs` it imports) additionally emits `web/api/_knowledge-index.js`:

```js
export const chunks = [{ id, type, title, text, keywords }, ...]
```

- `type: 'workflow'` — one per workflow from `workflows.json`: full description (no truncation), category, platform list/status. ~1–2KB each.
- `type: 'signal'` — one per skill from `skills/skills.json`: name, description, spec summary capped ~2KB.
- `type: 'mcp'` — one per MCP tool (`web/src/data/mcpTools.js` + usedBy mapping) plus one MCP-overview chunk.
- `type: 'api'` — from `openapi.json`: one auth/overview chunk + one chunk per tag/path-prefix group (endpoints, methods, one-line param summaries).
- `type: 'guide'` — one per Setup Guide, text-extracted from root `index.html` sections (`#guide-slack-view`, `#guide-teams-view`, `#guide-email-view`, `#guide-google-chat-view`, `#guide-cross-tool-view`, `#guide-backstory-mcp-view`): strip tags/scripts, collapse whitespace, cap ~4KB (split by headings if longer). **Soft-fail:** if extraction finds no sections, warn and skip guide chunks — never fail the build.
- `type: 'concept'` — platform concepts / About copy (what workflows, signals, MCP are).
- `keywords`: title tokens + category + curated aliases (e.g. "zap", "recipe", "skill").

### 4.2 Retrieval (`web/api/_retrieval.js`)

Pure, unit-tested functions:
- `tokenize(text)` — lowercase, strip punctuation, drop stopwords.
- `scoreChunk(queryTokens, chunk)` — term-frequency with saturation (BM25-lite), title/keyword matches weighted 3×, length-normalized.
- `selectChunks(query, chunks, {k = 8, maxChars = 12000, minScore})` — top-k by score above threshold, truncated to the char budget.
- Query text: latest user message; if it's under ~4 tokens, prepend the previous user message for context.

### 4.3 Prompt & API changes

`web/api/_anthropic.js`:
- New surface **`platform`** → librarian system prompt: identity ("the Backstory Librarian — the brain of the Automation Library"), the existing voice register, the existing CONCEPTS + compact catalogue index (both surfaces' items) + MCP block, **plus** a strategy section: help sequence adoption, combine flows + signals + MCP for a revenue motion, discuss trade-offs; strategy talk must stay grounded in actual library items.
- All surfaces gain a `Relevant library detail` block containing this turn's retrieved chunks (title + text each). Retrieval errors → empty block (fail-open).
- Zod reply schema, artifact rules (n8n shape guidance), draft/marketplace semantics: **unchanged**.
- For `platform`, `recommendations` may mix workflow and signal ids.

`web/api/chat.js`: accept `surface: 'platform'` in validation; everything else unchanged.

Client (`web/src/lib/assistant.js`): unchanged API shape. `MessageList` recommendation links resolve via a merged lookup `{ id: { name, category, kind: 'workflow' | 'signal' } }` → `/workflow/:id` or `/signals/:id` by kind.

### 4.4 Request flow

textarea → `useAssistantChat.ask()` → POST `/api/chat` `{surface:'platform', messages(≤20), persona, attachments(≤4), pageContext}` → `selectChunks()` → `buildSystemPrompt(...retrieved block...)` → one `messages.parse` call (model from `ANTHROPIC_MODEL`, 8192 max tokens) → normalized `{reply, recommendations, draft, artifact}` → rendered turn (cards/downloads) → persisted.

## 5. Error handling

- No `ANTHROPIC_API_KEY` → existing OFFLINE reply. API error → existing friendly retry reply.
- Retrieval/index failures → chat proceeds with compact index only (today's floor).
- Guide extraction failure → build warning, guide chunks skipped, deploy unaffected.
- localStorage unavailable/corrupt → in-memory conversation, no crash.
- Payload bounds: 20 messages, 4 attachments ≤3MB each, retrieved block ≤12K chars.

## 6. Testing (vitest, existing setup)

- `_retrieval`: ordering by relevance, stopword handling, k/char caps, short-query fallback, empty-index safety.
- Knowledge builder: chunk shapes per type; guide extraction against a small HTML fixture; soft-fail path.
- Greeting util: hour boundaries (11:59 → morning, 12:00 → afternoon, 18:00 → evening).
- Chat store: persist/restore/cap/reset; storage-throwing environment degrades gracefully.
- API: `chat.js` accepts `platform` and rejects unknown surfaces; `buildSystemPrompt('platform', …)` contains librarian identity + retrieved block; existing surface tests still pass.
- Manual verify before finishing: home → ask → thread → build artifact → download; widget ↔ page conversation continuity; hamburger on mobile + desktop; `/library` reachable.

## 7. Out of scope

No auth or name capture; no multi-conversation history/sidebar; no streaming; no embeddings/vector store; no agentic tool-use retrieval (documented upgrade path if keyword scoring proves shallow); no model selector; no changes to the legacy Pages site.
