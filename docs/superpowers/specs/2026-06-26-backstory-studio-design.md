# Backstory Studio — Design

**Date:** 2026-06-26
**Status:** Design — awaiting user review
**Target repo:** `jamesmcdaniel-cyber/Backstory_Studio` (currently empty)
**Source/base:** `JamesMcDaniel04/SprintIQ` @ branch **`sprint-iq-struggles`** (lowercase — the lean,
non-PM, Den-style agent builder that's deployed at `sprint-iq-git-sprint-iq-struggles-…vercel.app`;
**not** the heavier capitalized `SprintIQ_Struggles`).
**UI/UX target:** the deployed Den-style agent builder (see screenshot 2026-06-26): left workspace
sidebar (Home / Integrations / Explore + agent folders + profile), center **Activity** feed with a
"Describe an agent to build…" prompt + **New agent**, right **Output / Tool calls** panel with
"Ask about this output." The base branch already ships this UI — we keep it and rebrand.

## 1. Goal

Let users **run our existing workflow templates as scheduled agents** inside Backstory Studio —
over the **Backstory MCP**, powered by **Claude or OpenAI** — instead of rebuilding each one in
n8n, Workato, or Zapier. The templates we already produced (38 workflows + 30 LLM skills) become
runnable, schedulable agents with clear, explained output.

## 2. Approach — fork the lean branch, rewire to Backstory

We do **not** build from scratch. The `sprint-iq-struggles` branch is **already** the lean,
non-PM agent builder we want — it ships the Den-style UI, both LLM SDKs, an MCP layer, a scheduler,
and an agent/workflow/execution model. We seed `Backstory_Studio` from it and mostly **rewire the
domain** (point at the Backstory MCP, import our templates, rebrand). Stripping is minimal because
this branch was already cut down from the heavy SprintIQ.

### Reuse (already present in the base branch — verified)
- **Next.js 15 App Router**, **Tailwind**, Vercel deploy.
- **Supabase auth + Prisma/Postgres** (accounts, saved agents). [decision: Supabase accounts]
- **Den-style UI** — `src/app/dashboard/page.tsx` (Activity feed + "Describe an agent" + New agent),
  `src/components/layout/sidebar.tsx`, `src/app/dashboard/agent-config-dialog.tsx`. [decision: reuse builder]
- **Agent/workflow/execution model** — `app/api/{agents,workflows,executions,agent-templates}` +
  `app/templates`.
- **Scheduling** — `bullmq` + `ioredis`, `src/lib/queue` + `src/lib/workers` (the "run on schedules" engine). [decision: schedules]
- **LLM layer** — `src/lib/llm/model-runner.ts` with **both** `openai` and `@anthropic-ai/sdk`
  already installed. [decisions: Claude + OpenAI]
- **MCP + integrations layer** — `src/lib/mcp/*` (Klavis client + `provider-capabilities` +
  `server-provisioning`), `app/api/mcp/connections`, and `src/lib/pipedream/*` for connections.

### Add / adapt
- **Backstory MCP connection — OAuth 2.0** [decision]. The user authorizes the Backstory MCP via an
  OAuth 2.0 flow; we store the access/refresh tokens in the existing encrypted connection model
  (`app/api/mcp/connections` + credential store) and call the MCP behind a thin `BackstoryMcpClient`
  boundary (auto-refresh on expiry). Tools (from our skills): `find_account`, `get_account_status`,
  `get_scorecard`, `get_engaged_people`,
  `get_recent_account_activity`, `account_company_news`, `ask_sales_ai_about_account`,
  `get_opportunity_status`, `ask_sales_ai_about_opportunity`, `get_recent_opportunity_activity`, `top_records`.
- **BYO-key for both providers** — provider picker (Claude | OpenAI) + per-user keys stored encrypted;
  confirm `model-runner` reads them. [decision: BYO-key]
- **Template import** — map our `workflows.json` (38) into the branch's **agent-template** model, and
  our **30 skills** (`skills.json` + `SKILL.md`) into selectable agent prompts/skills.
- **Test run** — **live MCP** when connected, **simulated** (sample data) otherwise; per-step output
  + a clear LLM explanation. [decision: both]
- **Rebrand** to Backstory (logo, copy, theme tokens), point auth/data at the new project.

### Strip (minimal — the base is already lean)
Remove leftover SprintIQ-specific copy/branding and any integration we don't use. No PM-domain
teardown needed (this branch has no sprints/OKRs/repos/GraphRAG).

## 3. Core concepts

- **Template** — one of our 38 workflows, expressed in the agent-template model: a trigger
  (manual or schedule), an ordered set of steps (MCP query → LLM step → transform → deliver), and
  config inputs (which account/opportunity, thresholds, delivery target).
- **Agent** — a user's configured instance of a template (their inputs, their MCP connection, their
  LLM provider, an optional schedule). Saved to Supabase.
- **Run** — one execution of an agent (manual test or scheduled). Stores per-step inputs/outputs,
  status, and the final explained result. Viewable in run history/logs.
- **Connection** — a stored, encrypted credential: a Backstory MCP connection and an LLM key.

## 4. Data model (Supabase — adapt SprintIQ's Prisma schema)

Reshape SprintIQ's schema down to:
- `users` / `accounts` (reuse Supabase auth + existing user table).
- `connections` — `{ id, user_id, type: 'mcp'|'llm', provider, secret(enc), config }`.
- `agents` — `{ id, user_id, template_id, name, config(json), schedule(cron|null), provider, enabled }`.
- `runs` — `{ id, agent_id, started_at, status, steps(json), result, error }`.
- Drop the PM-domain tables (sprints, issues, repos, OKRs, documents, graph).

## 5. Run engine (reused)

Reuse SprintIQ's agent execution + cron/BullMQ. An execution walks the template steps:
1. **MCP step** → call a Backstory MCP tool via `lib/mcp` (live) or return sampled data (simulated).
2. **LLM step** → Claude/OpenAI (user's provider+key) composes/scores using the skill prompt.
3. **Transform/deliver** → format output; deliver targets (Slack/email) are previewed in v1,
   actually sent only if a delivery connection is configured.
Scheduled agents run via `cron/enqueue-agent-execution` on the existing queue.

## 6. Out of scope (v1)
- React Flow / node-graph canvas (reuse the config builder; canvas is a later enhancement).
- The stripped PM domain (Jira/GitHub/Linear/docs/GraphRAG/OKRs/repositories).
- Real outbound delivery beyond preview unless a delivery connection is set.
- Migrating SprintIQ's heaviest infra (k8s/fly) — target Vercel + managed Redis/Postgres.

## 7. Risks
- **MCP connection = OAuth 2.0** [resolved]. We implement an OAuth 2.0 authorize/callback/refresh
  flow for the Backstory MCP and store tokens in the connection model. Open detail for the plan: the
  exact OAuth endpoints / client registration for the Backstory MCP (auth URL, token URL, scopes) —
  confirm during step 3. Keep the `BackstoryMcpClient` boundary so the call transport (HTTP/SSE) is swappable.
- **Klavis/Pipedream coupling.** The base's integration layer assumes Klavis-provisioned servers;
  adding a first-party Backstory MCP may need a parallel path rather than reusing Klavis as-is.
- **Env + infra to provision on the new project.** Supabase (DB+auth), Redis (Upstash) for the queue,
  and the existing env keys — set up on the Vercel project under `jamesmcdaniel-cyber`.
- **Branch hygiene.** Base is `sprint-iq-struggles` (lowercase). Confirm its HEAD matches the deployed
  screenshot before forking (it ships the Activity/sidebar/agent-config UI we verified).

## 8. Testing
- Unit: template-import mapping (`workflows.json` → agent template), MCP-step adapter (mocked MCP),
  LLM provider selection (mocked SDKs), run-step reducer.
- Integration: one template end-to-end with a mocked Backstory MCP + mocked LLM → produces a run.
- Manual: connect a real Backstory MCP + a real LLM key, run a template live, then schedule it.

## 9. Build sequence (for the plan)
1. **Seed repo** — copy the `sprint-iq-struggles` branch into `Backstory_Studio`; provision env
   (Supabase, Redis, keys); get it building/running locally + a first deploy.
2. **MCP OAuth scaffolding** — `BackstoryMcpClient` boundary + OAuth 2.0 authorize/callback/refresh
   routes; confirm the Backstory MCP OAuth endpoints/scopes.
3. **Backstory MCP** — wire `BackstoryMcpClient` into the connection model + a connection settings
   screen (Connect via OAuth); expose the tool list.
4. **Providers + BYO-key** — confirm/extend `model-runner` for a Claude|OpenAI picker with per-user keys.
5. **Template import** — map `workflows.json` (38) + `skills.json`/`SKILL.md` (30) into agent templates.
6. **Test run** — live (MCP connected) + simulated fallback; per-step + explained output.
7. **Schedule** — confirm queue/worker enqueue for saved agents on a cron.
8. **Rebrand + trim** — Backstory theme/logo/copy; remove leftover SprintIQ branding; deploy to Vercel.
