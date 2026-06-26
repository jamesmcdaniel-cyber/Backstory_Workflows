# Backstory Studio — Design

**Date:** 2026-06-26
**Status:** Design — awaiting user review
**Target repo:** `jamesmcdaniel-cyber/Backstory_Studio` (currently empty)
**Source/base:** `JamesMcDaniel04/SprintIQ` @ branch `SprintIQ_Struggles`

## 1. Goal

Let users **run our existing workflow templates as scheduled agents** inside Backstory Studio —
over the **Backstory MCP**, powered by **Claude or OpenAI** — instead of rebuilding each one in
n8n, Workato, or Zapier. The templates we already produced (38 workflows + 30 LLM skills) become
runnable, schedulable agents with clear, explained output.

## 2. Approach — fork SprintIQ, prune, repurpose

We do **not** build from scratch. SprintIQ already ships the exact engine we need; we seed the
empty `Backstory_Studio` repo from `SprintIQ_Struggles`, aggressively prune its project-management
domain + extra infra, and repurpose the agent/automation/scheduler core to run our templates.

### Reuse (the heavy lifting)
- **Next.js 15 App Router** scaffold, **Tailwind**, build/deploy config (Vercel).
- **Supabase auth + Postgres** (accounts, saved agents). [decision: Supabase accounts]
- **MCP client/orchestrator** — `src/lib/mcp/*` (`mcp-base`, `mcp-orchestrator`, `credential-manager`).
- **Agent runtime** — `app/api/agents/*` (incl. `agents/scheduler`), `app/api/automations/*`,
  `app/api/agent-templates`, and the agent/automation **UI** in `src/components/{agents,automation}`.
- **Scheduling** — `app/api/cron/*` (`enqueue-agent-execution`, …) on **BullMQ/Redis** (the
  "run on schedules" engine). [decision: run on schedules]
- **LLM layer** — `src/lib/ai/*` (OpenAI already present).

### Add / adapt
- **Anthropic SDK** (`@anthropic-ai/sdk`) alongside OpenAI → a **provider picker** (Claude | OpenAI)
  with **bring-your-own-key** stored per user (encrypted, via the existing `credential-manager`).
  [decisions: Claude + OpenAI, BYO-key]
- **Backstory MCP connection** — point the MCP client at the user's Backstory MCP (endpoint + token).
  Tools available (from our skills): `find_account`, `get_account_status`, `get_scorecard`,
  `get_engaged_people`, `get_recent_account_activity`, `account_company_news`,
  `ask_sales_ai_about_account`, `get_opportunity_status`, `ask_sales_ai_about_opportunity`,
  `get_recent_opportunity_activity`, `top_records`.
- **Template import** — convert our `workflows.json` (38) into **agent templates** in SprintIQ's
  template model; our **30 skills** (`skills.json` + each `SKILL.md`) become selectable agent
  **prompts/skills**.
- **Test run** — execute an agent on demand: **live MCP** when a Backstory MCP connection exists,
  **simulated** (sample/mock data) otherwise. Per-step output + a clear LLM explanation. [decision: both]
- **Reused config/template builder UI** (no node canvas in v1). [decision: reuse SprintIQ agent builder]

### Strip (SprintIQ's PM domain + infra we don't need)
Jira/GitHub/Linear integrations, documents/GraphRAG, OKRs/key-results, repositories, PM-specific
dashboards, and unneeded infra (k8s/fly, Klavis/LangGraph MCP orchestration if it doesn't fit the
Backstory MCP). Goal: cut to the **agent + MCP + scheduler + auth** core.

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
- **SprintIQ is large and tangled.** Pruning to the core is real work; expect broken imports while
  cutting the PM domain. Mitigation: fork, then prune module-by-module with the app building after each cut.
- **MCP coupling.** SprintIQ's MCP layer references Klavis/LangGraph; the Backstory MCP may connect
  differently. Confirm the Backstory MCP transport (hosted MCP endpoint + token) early and adapt
  `lib/mcp` to it; keep a thin `BackstoryMcpClient` boundary.
- **Prisma → Supabase schema reshape.** Reducing the PM schema touches migrations/seeds.
- **Queue/Redis infra.** Scheduling needs Redis (Upstash) provisioned on the new deploy.

## 8. Testing
- Unit: template-import mapping (`workflows.json` → agent template), MCP-step adapter (mocked MCP),
  LLM provider selection (mocked SDKs), run-step reducer.
- Integration: one template end-to-end with a mocked Backstory MCP + mocked LLM → produces a run.
- Manual: connect a real Backstory MCP + a real LLM key, run a template live, then schedule it.

## 9. Build sequence (for the plan)
1. **Seed repo** — copy `SprintIQ_Struggles` into `Backstory_Studio`; get it building/running locally.
2. **Prune** — remove the PM domain + unneeded integrations/infra; keep agent + MCP + cron + auth; app still builds.
3. **LLM providers** — add Anthropic SDK + provider picker + BYO-key via `credential-manager`.
4. **Backstory MCP** — `BackstoryMcpClient` boundary + connection settings; wire the tool list.
5. **Template import** — map `workflows.json` (38) + `skills.json`/`SKILL.md` (30) into agent templates.
6. **Test run** — live (MCP connected) + simulated fallback; per-step + explained output.
7. **Schedule** — wire cron/BullMQ enqueue for saved agents.
8. **Branding/strip UI** — Backstory look; remove PM screens; deploy to Vercel.
