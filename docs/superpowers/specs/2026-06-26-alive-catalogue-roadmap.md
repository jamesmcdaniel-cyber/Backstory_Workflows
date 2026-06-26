# Roadmap — "A Catalogue That Feels Alive"

**Date:** 2026-06-26
**Status:** Approved (decomposition + sequence)
**Owner:** James McDaniel

## Goal

Turn the Backstory Automation Library from an internal-feeling static catalogue into a
public-ready, *alive* product surface for workflows, skills, and the API — anchored by an
AI assistant that helps people find what exists, build what doesn't, and feed new ideas
back into the catalogue.

## Constraints (apply to every stream)

- **The current GitHub-hosted version stays as-is.** The live site is the legacy repo-root
  `index.html`; it is never touched. The `web/` React app keeps byte-for-byte identical
  GitHub Pages behavior (base path `/Backstory_Workflows/`); Vercel support is purely additive.
- **New hosting target: Vercel** (serverless functions enabled). Single codebase in `web/`,
  deploys to both Pages (unchanged) and Vercel (new).
- **Design system** (see project memory `platform-ui-design-system`): dark Vercel-style,
  near-black cards on `#2e2e2e` hairlines, white-only accent (dark text on white), Chivo Mono
  structural type, `///` eyebrow signature, painterly meeting-bg heroes.
- **Audience: mixed** — a global persona (`AE · CSM · RevOps · Developer · Evaluator`)
  tailors language, ordering, and what the assistant leads with.
- **"Alive" means** all four: interactive & guided, real dynamic signals (no fake activity),
  polished motion, and a distinct personality/voice.

## Decomposition & Sequence

Each stream is independently shippable and gets its own `spec → plan → build` cycle.

### Stream 1 — AI Liaison + Skill Builder  *(spec written: `2026-06-26-ai-liaison-skill-builder-design.md`)*
The interactivity engine. Makes `web/` Vercel-deployable and replaces both search bars with a
conversational "ask" bar that finds existing workflows/skills, drafts new ones, and submits
them to an External Marketplace (GitHub issues). Reads the global persona (graceful if absent)
and speaks with a distinct voice. Foundation for everything below.

### Stream 2 — Onboarding & Persona
Global persona state (localStorage) + header switcher; first-run orientation; a guided first
query that drops the visitor into the assistant; smart empty states. Persona re-orders and
re-languages the catalogue. **Depends on Stream 1.**

### Stream 3 — Interactive API Guide
Build the `/api-docs/*` placeholder route into a real explorable reference from `openapi.json`
(41 endpoints): endpoint browser, schema viewer, copyable request/response examples. The
assistant can also answer API questions. **Mostly independent.**

### Stream 4 — "Alive" Polish
A motion system (hover/transition choreography, animated counts, living hero, reveal-on-scroll)
plus real dynamic signals. *What's-new* and *recently-validated* derive for free from existing
data (`workflows.json._generated`, `platform_status`). True *trending / most-viewed* needs a
tiny counter store (Vercel KV) — decide build-vs-defer at this stream. **Layered on once
surfaces exist.**

### Stream 5 — Public Hardening
SEO/OG meta, privacy-friendly analytics, performance pass, and a personality/voice copy pass to
de-jargon for external readers. **Last — polishes finished surfaces.**

## Sequencing Rationale

1 unlocks the "alive" feeling and the backend → 2 makes first-touch coherent → 3 fills the
biggest content gap → 4 makes it *look* alive → 5 makes it public-ready. One at a time so each
is reviewable and shippable.
