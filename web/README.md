# Backstory Platform — React app (migration in progress)

The new platform UI, rebuilt with **React + Vite + Tailwind CSS + Radix UI**. This
lives alongside the legacy static site (repo-root `index.html`) and does **not**
replace it until you cut over (see Deploy).

## Run

```bash
cd web
npm install
npm run dev      # http://localhost:5173/Backstory_Workflows/
npm run build    # outputs web/dist
npm run preview  # serve the production build
```

Data (`workflows.json`, `openapi.json`, `skills.json`) and `assets/` are synced
from the repo root into `web/public/` automatically before `dev`/`build`
(`scripts/sync-data.mjs`), so the repo root stays the single source of truth.

## Stack & conventions

- **Routing:** `react-router-dom` HashRouter (keeps `#/...` URLs; no server config needed on GitHub Pages).
- **Styling:** Tailwind, with the Backstory palette exposed as theme tokens (`ac-*`, `wf-*`) in `tailwind.config.js`.
- **Primitives:** Radix UI — `ToggleGroup` (filters), `Tabs`, `Dialog`, `Tooltip`. Wrappers live in `src/components/ui/`.
- **Base path:** `/Backstory_Workflows/` (set in `vite.config.js`).

## Routes

The AI assistant ("Librarian") is the primary experience:

| Route | Page |
| --- | --- |
| `/` | **Librarian** — assistant home: greeting, composer, and thread. The brain of the platform: it answers about anything on the site, builds workflows, and talks strategy. |
| `/library` | Catalogue landing (section cards) |
| `/flows`, `/workflow/:id` | Auto flows catalogue + detail |
| `/signals`, `/signals/:id` | Signals catalogue + detail |
| `/mcp` | MCP Capabilities |
| `/api-docs` | API Docs |
| `/guides` | Setup Guides (legacy content embedded in-app) |
| `/about` | About |

All navigation lives in a right-side **hamburger sheet** (Radix Dialog) at every
viewport size. The assistant is one shared conversation: a floating widget on
every page except `/`, the full page at `/`, both over a single store persisted
to `localStorage` (`backstory.chat.v1`). The Librarian answers over a build-time
**knowledge index** (`api/_knowledge-index.js`, emitted by `sync-data.mjs` from
every workflow, signal, MCP tool, API-doc group, and setup guide) with per-turn
BM25-lite retrieval (`api/_retrieval.js`).

## Deploy (cutover)

Deployment is **manual** via `.github/workflows/deploy-web.yml`
(`workflow_dispatch`). Running it builds `web/` and publishes `web/dist` to Pages.
Switching the repo's **Settings → Pages → Source** to **GitHub Actions** is the
actual cutover from the legacy static site. Do this only once the pages above are
all migrated, so nothing regresses.

## Deploy to Vercel (with the AI assistant)

The same app deploys to Vercel with two serverless functions in `web/api/`:

1. Import the repo in Vercel and set **Root Directory → `web`** (so `web/api/*` become
   functions and `web/dist` is the output). Framework auto-detects as Vite.
2. Set env vars (see `.env.example`): `ANTHROPIC_API_KEY` (required), `ANTHROPIC_MODEL`
   (optional), `GITHUB_TOKEN` + `GITHUB_REPO` (for marketplace submissions).
3. Deploy. The build sets base path `/` automatically (Vercel sets `VERCEL=1`).

GitHub Pages is unaffected — `deploy-web.yml` builds with the default base `/Backstory_Workflows/`
and never publishes `web/api/`.
