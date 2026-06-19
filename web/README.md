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
