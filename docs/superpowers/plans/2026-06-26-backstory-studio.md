# Backstory Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.
>
> **Plan type:** fork-and-adapt of an existing large app. Phases are the task units; each ends with a build/run/deploy verification. In-file edits are derived by reading the named SprintIQ files at execution time — this plan names the files and the change, not invented line-level code, because the base codebase hasn't been fully read. Concrete data we own (template mapping) is spelled out.

**Goal:** Stand up Backstory Studio — users run our 38 workflow templates + 30 skills as scheduled agents over the Backstory MCP (OAuth 2.0), powered by Claude/OpenAI (BYO-key) — by forking the lean `sprint-iq-struggles` branch and rewiring its domain.

**Architecture:** Fork `JamesMcDaniel04/SprintIQ@sprint-iq-struggles` into `jamesmcdaniel-cyber/Backstory_Studio`. Keep its Den-style UI, `model-runner` (OpenAI+Anthropic), agent/workflow/execution model, queue/workers scheduler, Supabase auth + Prisma, and MCP connection model. Rewire: Backstory MCP via OAuth 2.0 behind a `BackstoryMcpClient` boundary, import our templates/skills, BYO-key provider picker, rebrand.

**Tech Stack:** Next.js 15 (App Router), Tailwind, Supabase (auth+Postgres), Prisma, BullMQ+ioredis, `openai` + `@anthropic-ai/sdk` (`lib/llm/model-runner.ts`), MCP connection model (`app/api/mcp/connections`, `lib/mcp`), Vercel.

## Global Constraints
- **Base branch is `sprint-iq-struggles` (lowercase).** Not `SprintIQ_Struggles`.
- **Target repo:** `jamesmcdaniel-cyber/Backstory_Studio` (empty).
- **MCP connection = OAuth 2.0**, tokens stored encrypted in the existing connection model; calls go through a thin swappable `BackstoryMcpClient` boundary with auto-refresh.
- **LLM = Claude + OpenAI, bring-your-own-key** (per-user, encrypted), via `model-runner`.
- **Persistence = Supabase accounts.** **Scheduling = BullMQ + Redis.**
- Keep the Den-style UI from the base; rebrand to Backstory, don't redesign.
- After every phase: app builds (`npm run build`) and the touched flow works; commit; deploy preview.
- **User-provisioned (not code):** Supabase project, Redis (Upstash), Vercel project under `jamesmcdaniel-cyber`, and the Backstory MCP OAuth client (auth URL, token URL, client id/secret, scopes, redirect).

---

### Phase 1 — Seed the repo and get it running

**Deliverable:** `Backstory_Studio` contains the `sprint-iq-struggles` code, builds, and runs locally + a first Vercel deploy boots.

**Prereqs (user):** Supabase project URL+keys, a Redis URL (Upstash), and the existing env keys the base expects (it has an `.env.example` — we fill it). Vercel project created (or `vercel link`).

- [ ] **Seed contents.** Copy the working tree of `JamesMcDaniel04/SprintIQ@sprint-iq-struggles` into a clean clone of `jamesmcdaniel-cyber/Backstory_Studio` (preserve files, drop SprintIQ's `.git` history; init fresh on `main`). Commit "chore: seed from sprint-iq-struggles".
- [ ] **Read `.env.example`** and produce `.env.local` with the real values (Supabase, Redis, `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` optional since BYO-key, any others). List any unknown required vars back to the user.
- [ ] **Install + DB.** `npm install`; `npx prisma generate`; `npx prisma migrate deploy` (or `db push`) against the Supabase Postgres.
- [ ] **Run locally.** `npm run dev`; confirm the dashboard (Activity feed + sidebar) renders and login works. **Verify:** screenshot the running dashboard; it matches the Den-style UI.
- [ ] **First deploy.** Push `main`; deploy to the Vercel `jamesmcdaniel-cyber` project (Root Directory as the repo root — it's a single Next.js app). **Verify:** the deployed URL loads the dashboard.
- [ ] **Commit/push.**

---

### Phase 2 — MCP OAuth scaffolding (`BackstoryMcpClient` boundary)

**Deliverable:** an OAuth 2.0 connect/callback/refresh flow stub for the Backstory MCP, and a `BackstoryMcpClient` interface, with tests for the token/refresh logic (mocked HTTP).

**Prereqs (user):** Backstory MCP OAuth details — authorize URL, token URL, client id/secret, scopes, and the allowed redirect URI. (Provide these or confirm they match a standard provider.)

**Files (study first):** `src/app/api/mcp/connections/*`, `src/lib/mcp/*` (`klavis-client.ts`, `server-provisioning.ts`), the credential/encryption util, `src/lib/llm/model-runner.ts` (for how tools are invoked).

- [ ] **Study** the existing connection model + credential storage; document how a connection record is shaped and where secrets are encrypted.
- [ ] **Create `src/lib/mcp/backstory-mcp-client.ts`** — a class with `getTools()`, `callTool(name, args)`, constructed from a stored connection; transport behind one private method so HTTP/SSE is swappable. (TDD the token-attach + 401→refresh path against a mocked fetch.)
- [ ] **Create OAuth routes** `src/app/api/mcp/backstory/authorize/route.ts` (redirect to MCP authorize URL with state) and `.../callback/route.ts` (exchange code → store encrypted tokens as an `mcp` connection). (TDD the state check + token-exchange handler with mocked token endpoint.)
- [ ] **Refresh helper** in `backstory-mcp-client.ts`: on expiry/401, use the refresh token, persist new tokens. (TDD.)
- [ ] **Verify:** unit tests pass; `npm run build` clean. **Commit.**

---

### Phase 3 — Wire the Backstory MCP into the app (connection UI + tool list)

**Deliverable:** a "Connect Backstory MCP" action in the integrations/settings UI that runs the OAuth flow; once connected, the agent runtime can list/call the Backstory MCP tools.

**Files (study first):** `src/app/integrations/*`, `src/app/api/integrations/status`, the agent execution path (`src/app/api/agents/*`, `src/app/api/executions/*`, `src/lib/llm/model-runner.ts`).

- [ ] **Connection UI:** add a Backstory MCP card to the integrations screen → "Connect" → `/api/mcp/backstory/authorize`; show connected state from the connection record.
- [ ] **Tool exposure:** make the agent runtime resolve the Backstory MCP tools via `BackstoryMcpClient.getTools()` for a connected user; the documented tool set: `find_account, get_account_status, get_scorecard, get_engaged_people, get_recent_account_activity, account_company_news, ask_sales_ai_about_account, get_opportunity_status, ask_sales_ai_about_opportunity, get_recent_opportunity_activity, top_records`.
- [ ] **Verify (manual):** connect a real Backstory MCP via OAuth; in a scratch agent run, confirm a tool call (e.g. `find_account`) returns real data. **Commit.**

---

### Phase 4 — Providers + bring-your-own-key

**Deliverable:** a provider picker (Claude | OpenAI) and per-user encrypted API keys that `model-runner` uses for LLM steps.

**Files (study first):** `src/lib/llm/model-runner.ts`, the connection/credential store, settings UI.

- [ ] **Study `model-runner.ts`** — confirm how it selects provider + reads keys today (env vs per-request).
- [ ] **Per-user keys:** store `llm` connections (provider + encrypted key) like MCP; settings UI to add/remove. (TDD the key-resolution function: given user+provider → key.)
- [ ] **Wire `model-runner`** to prefer the user's key for the chosen provider; provider selectable per agent (default from settings).
- [ ] **Verify:** unit test for key resolution; manual — run an LLM step with a user-supplied Claude key and again with OpenAI. **Commit.**

---

### Phase 5 — Import our templates + skills as agent templates

**Deliverable:** our 38 workflows + 30 skills appear as agent templates a user can instantiate.

**Files (study first):** `src/app/api/agent-templates/route.ts`, `src/app/templates/*`, the agent-template data shape; **our data:** `workflows.json` (38) and `skills/skills.json` + `skills/*/SKILL.md` (30) from this repo (copy them into the Studio repo under e.g. `data/backstory/`).

- [ ] **Study** the agent-template schema (fields the base expects: name, description, steps/prompt, inputs, trigger).
- [ ] **Write `scripts/import-backstory-templates.ts`** mapping each `workflows.json` entry → an agent template: name/description from the workflow; steps from `trigger` + `node_flow` (MCP query → LLM → deliver); inputs from `configuration`; and attach the matching skill prompt (from `SKILL.md`) where a workflow maps to a skill. (TDD the pure mapping function: one `workflows.json` entry → expected agent-template object.)
- [ ] **Seed** the templates into the DB (or serve from a generated JSON the templates route reads).
- [ ] **Verify:** templates list shows our 38; instantiating one creates a configurable agent. **Commit.**

---

### Phase 6 — Test run (live + simulated)

**Deliverable:** a "Run / Test" on an agent that executes its steps — live MCP when connected, simulated (sample data) otherwise — and shows per-step output + a clear LLM explanation.

**Files (study first):** `src/app/api/executions/*`, the run/execution UI (the Output / Tool calls panel in `dashboard/page.tsx`).

- [ ] **Live path:** execution walks steps → `BackstoryMcpClient.callTool` for MCP steps, `model-runner` for LLM steps; persist a `run` with per-step IO.
- [ ] **Simulated path:** when no MCP connection, MCP steps return sampled data (from our `sample_output` fields in `workflows.json`); flag the run as simulated.
- [ ] **Explanation:** final LLM step produces a plain-language summary of the result (the "clearer answers" goal).
- [ ] **Verify:** run a template live (real data) and simulated (no connection); both render in the Output panel. **Commit.**

---

### Phase 7 — Scheduling

**Deliverable:** a saved agent can run on a cron schedule via the existing queue/workers.

**Files (study first):** `src/lib/queue/*`, `src/lib/workers/*`, any existing cron/enqueue route.

- [ ] **Schedule field** on an agent (cron); UI to set it.
- [ ] **Enqueue:** wire scheduled agents into the queue (reuse the base's enqueue/worker pattern); worker runs the Phase-6 execution path.
- [ ] **Verify:** schedule an agent at a near-term cron; confirm a run appears in history at the scheduled time (or via a manual enqueue trigger). **Commit.**

---

### Phase 8 — Rebrand + trim + ship

**Deliverable:** Backstory-branded Studio, leftover SprintIQ branding/integrations removed, deployed to production.

- [ ] **Brand:** logo, app name, theme tokens, marketing/landing copy → Backstory.
- [ ] **Trim:** remove integrations/screens we don't use (keep MCP + the agent flow); ensure nav reflects the Studio (Home / Integrations / Explore + agents).
- [ ] **Verify:** full build + a clean run-through (connect MCP → instantiate template → test → schedule); production deploy. **Commit/push.**

---

## Self-review notes
- **Spec coverage:** OAuth MCP (P2–3), BYO-key providers (P4), template/skill import (P5), live+simulated test (P6), scheduling (P7), Den UI reuse + rebrand (P1, P8), Supabase persistence (P1). All spec sections map to a phase.
- **Known deviation from the skill's ideal:** in-file line-level code isn't pre-written for phases 2–8 because the SprintIQ internals must be read first; each phase names the exact files to study and a verification gate. The one place we own the data (template mapping, P5) is concretized. Treat each phase as "study named files → implement → verify".
