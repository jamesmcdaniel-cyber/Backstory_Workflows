# Starter Library — Design

Date: 2026-09-24
Status: Draft, awaiting review
Target repo: `jamesmcdaniel-cyber/Customer_Automation_Library` (currently empty)
Host: Vercel

## Goal

A simplified, public, customer-facing companion to the full Backstory Automation
Library. It gives customers the crawl/walk experience the full library skips,
organized by maturity: **Get It → Trust It → Use It → Stretch It**. It has four
starter examples, each simple enough to demo in a short video. The full
38-workflow library stays where it is and becomes the "Stretch It" destination.
It is linked from here, not copied.

## Audience and success

- **Audience:** Backstory customers new to MCP. Reps and managers use it
  directly. Admins and security reviewers read "Trust It".
- **Success:** a new customer lands on the site, understands what MCP is,
  connects the Backstory MCP to Claude or ChatGPT, and gets a useful answer from
  the first starter example within 15 minutes, without reading anything
  technical.
- **Complementary to Intercom:** Intercom keeps concise, searchable help and the
  security basics. This site holds richer, visual, video-led guidance and links
  to Intercom rather than duplicating it.
- **Access:** everything on this site is public and not gated. Deeper
  implementation material stays behind the existing library link.

## Starter examples

All examples are **prompts typed into an AI chat** (Claude or ChatGPT) with the
Backstory MCP connected. There is nothing to build or schedule.

Each prompt is written to fit what the MCP can actually do:
- 13 read-only tools
- 30 days of matched activity
- no calendar, transcripts, metrics, historical roll-ups or CRM writes

| # | Example | Who it's for | Based on | Sample prompt | MCP tools it relies on |
|---|---------|--------------|----------|---------------|------------------------|
| 1 | **Meeting prep brief** — *Start here* | Reps, CSMs | #02 | "I'm meeting with Acme tomorrow. Brief me: where things stand, who's engaged, open risks, and what I should push for." | `find_account`, `get_account_status`, `get_recent_account_activity`, `get_engaged_people` |
| 2 | **Deal risk + next actions** | Reps, managers | #37 | "What's putting the Acme renewal at risk, and what are the three things I should do this week?" | `find_account`, `get_opportunity_status`, `get_recent_opportunity_activity`, `ask_sales_ai_about_opportunity` |
| 3 | **Grounded follow-up email** | Reps | #35 | "Draft a follow-up email to Acme based on our recent activity and agreed next steps. Keep it under 150 words." | `find_account`, `get_opportunity_status`, `get_recent_opportunity_activity` |
| 4 | **Pipeline coaching review** | Managers | #36 + #34 | "Review my top deals. Flag any with open risks, missing next steps, or scorecard gaps, and tell me who needs a coaching conversation." | `top_records`, `get_opportunity_status`, `get_scorecard` |

Each example has 2–3 prompt variations, for example a different account, a
shorter answer, or output as a table.

**Example 4 caveat:** `top_records` returns about 20 records chosen by
relevance. It is not a full pipeline, and it has no week-over-week "slipped"
detection. The card says this openly.

## Site structure

Five routes, all hash-routed so any static host can serve them:

- **`#/` Home**
  - A plain-English "What is MCP?" using the standard-plug analogy: "one
    standard plug that lets your AI assistant safely use Backstory".
  - A slot for the overview video.
  - Four stage tiles: Get It / Trust It / Use It / Stretch It.
  - A primary "Start here: Meeting prep brief" button.
- **`#/get-it`**
  - What MCP is.
  - What Backstory knows: CRM-matched emails, calls and meetings from the last
    30 days.
  - Which AI clients work with it.
  - A short glossary: MCP, connector, tool, prompt, account, opportunity.
- **`#/trust-it`**
  - Sign-in is OAuth 2.0 in your browser. Your password is never shared with
    the AI tool.
  - Read-only: it cannot change the CRM.
  - You see only data you already have permission to see.
  - What it can't do: no calendar, metrics, roll-ups or writes, and 30 days of
    history.
  - Links to the matching Intercom articles.
- **`#/use-it`**: the "First 15 minutes" path.
  1. A connect checklist: Settings → Connectors → Add custom connector → name
     it `Backstory` → paste `https://mcp.backstory.ai/mcp` → sign in.
  2. The four example cards, in order.
- **`#/example/<id>`**: one page per example, in this order:
  1. video slot
  2. what this helps you do
  3. who it's for
  4. time to try
  5. sample prompt with a copy button, plus variations
  6. expected output: a realistic mock for a fictional account ("Acme Corp"),
     clearly labelled as an example
  7. setup checklist
  8. "Next example" link
- **`#/stretch-it`**
  - A short framing: "when you want this to run on its own, every morning".
  - A link out to the full library at `backstory-workflows.vercel.app`, pointing
    to the scheduled versions of the four examples (#02, #37, #35, #36).

## Content model

All example content lives in `examples.json`, so video links, prompts and
outputs can change without touching code:

```json
{
  "id": "meeting-prep",
  "order": 1,
  "startHere": true,
  "title": "Meeting prep brief",
  "helpsYou": "Walk into any customer meeting knowing where things stand in under a minute.",
  "whoFor": ["Reps", "CSMs"],
  "timeToTry": "2 minutes",
  "prompt": "I'm meeting with Acme tomorrow. Brief me: ...",
  "variations": ["...", "..."],
  "expectedOutput": "markdown string rendered as the sample response",
  "checklist": ["Backstory connector added", "Signed in", "Know the account name"],
  "videoUrl": "",
  "caveat": "",
  "stretchLink": "https://backstory-workflows.vercel.app/workflow/02-meeting-brief"
}
```

A small `site.json` holds shared values:
- the overview video URL
- the Intercom article URLs
- the MCP endpoint
- the full-library URL

Any field left empty shows a "Coming soon" placeholder instead of a broken link
or embed. This includes videos and Intercom links.

**Videos:** `videoUrl` takes any embeddable URL (Loom, YouTube, Vimeo) and
renders it as an iframe with a 16:9 ratio.

## Stack

- A plain static site with no build step and no dependencies:
  - `index.html`
  - `app.js`: hash router and renderers, roughly 300 lines
  - `styles.css`
  - `examples.json`
  - `site.json`
  - `assets/`: logo and fonts
- Markdown in `expectedOutput` goes through a small built-in renderer that
  handles headings, lists, bold and tables. No library.
- Copy-prompt uses `navigator.clipboard` and shows a visible "Copied" state.

## Design

Uses the Backstory design system, as in the full library's `web/` app:
- white surface, Graphite `#171721` text, Horizon Blue `#447C93` for CTAs and
  links
- KMR Waldenburg (self-hosted, with an Arimo fallback) for text; Chivo Mono for
  eyebrows and labels
- the `///` mark in blue
- 12px card radius, 8px buttons
- sentence case throughout; no emoji

It works at phone width, since customers may open links from Slack or email.

## Hosting

- A new Vercel project for `Customer_Automation_Library`, deployed as static
  files with no framework preset.
- Because the repo is new, wire **Git auto-deploy** from the start. The full
  library currently deploys by CLI only.
- The project name and domain are chosen at deploy time. The default is
  `customer-automation-library.vercel.app` under the `backstory` team.

## Needs James's review before publishing

- **Trust It copy:** drafted from the MCP guide in `web/src/pages/McpCapabilities.jsx`
  (OAuth 2.0 with PKCE, read-only, permission-scoped, 13 tools, 30 days).
  Security wording should be confirmed.
- **Intercom article URLs:** unknown, so they ship empty and show "Coming soon".
- **Expected-output samples:** written by hand as realistic mocks. Replace them
  with real, anonymized output once the videos are recorded.
- **Service-account auth:** deliberately left out. It grants org-wide admin
  access and does not belong on a beginner, public page.

## Out of scope

- Admin and security starter pack as its own path. "Trust It" covers it for now.
- Separate Rep and Manager starter packs. The four examples are tagged by
  persona instead.
- An AI assistant widget, search, analytics, or anything gated.
- Changes to the existing 38-workflow library.

## Testing

- Every route renders, including an unknown example id, which falls back to
  Use It.
- The copy button works on each example.
- Empty `videoUrl` and Intercom fields show placeholders.
- No horizontal scroll at 375px width.
- Checked in a real browser before deploying.
