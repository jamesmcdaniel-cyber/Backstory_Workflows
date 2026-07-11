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

## Migration status

| Page | Status |
| --- | --- |
| Catalog (home) | ✅ migrated |
| Workflow detail | ✅ migrated |
| About | ✅ migrated |
| API Docs | ⏳ placeholder (port from `openapi.json` renderer) |
| Setup Guides | ⏳ placeholder |
| Opportunity Insights | ⏳ placeholder (port the interactive toolkit) |
| Skills | ⏳ placeholder (fold in `skills.json` + the 30 skills) |

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

## Generated workflow formats and health gate

The Librarian generates artifacts in the format the target actually supports:

- n8n: importable workflow JSON.
- Workato: native-first Markdown implementation guide; importable package ZIPs must be exported from a real Workato workspace.
- Zapier: editor/template Markdown implementation guide; no fake reusable workflow JSON.
- Claude and OpenAI: orchestrator instruction Markdown.

Copy and download stay disabled until `/api/health-check` passes the artifact's
platform-specific format, execution-path, safety, and validation checks. A passing
preflight does not replace credentialed connector testing in the target platform.
