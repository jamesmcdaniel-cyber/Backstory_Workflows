# Backstory Brand Knowledge Base

This reference captures the core visual system for Backstory outputs used in account plans, executive briefs, and workflow-generated artifacts. It mirrors the current Backstory product UI (near-black canvas, white-only accent, monospace structural type).

## Brand Essence

Backstory should feel modern, confident, and precise.

- Voice: direct, practical, and insight-led
- Tone: calm, clear, and analytical
- Visual posture: near-black interface, high contrast, restrained motion, monochrome accent

## Logo System

Use the Backstory mark as a rounded square with a bold `B`.

- Preferred mark: black `B` on a white fill (white is the only brand accent)
- Wordmark: `Backstory` in the structural monospace, medium-to-bold weight
- Signature: the `///` triple-slash motif may be used as a section marker
- Clear space: at least half the mark width on all sides
- Avoid gradients, outlines, drop shadows on the wordmark, or alternate letters

## Core Palette

Monochrome system: a near-black canvas with a single white accent. Use these colors in HTML outputs and mockups:

| Token | Hex | Usage |
| --- | --- | --- |
| Accent White | `#ffffff` | The only accent — buttons, active/focus, key highlights |
| Pure Black | `#000000` | Header, overlays, deepest inset background (inputs) |
| Near Black | `#0a0a0a` | App background, card / panel surface |
| Raised Surface | `#141414` | Slightly elevated panels and cards |
| Hover Tint | `#1a1a1a` | Subtle hover surface |
| Hairline Border | `#2e2e2e` | Dividers, table borders, subtle outlines |
| Primary Text | `#ededed` | Headings and body text |
| Secondary Text | `#a1a1a1` | Labels, helper copy, metadata |
| Tertiary Text | `#787878` | De-emphasized metadata |
| Success | `#62c073` | Positive status |
| Warning | `#d2a878` | Caution states |
| Danger | `#ef4444` | Risk states |

Optional muted category accents (desaturated, painterly — never neon): `#92bca6` (green), `#9fbac7` (blue), `#b5c7cf` (purple-gray), `#d0a46f` (orange). Use sparingly for chart series or category chips, never as a primary accent.

## Accent Discipline

- White is the only brand accent. Do not introduce indigo, purple, or gradient accents.
- Reserve white fills for the single most important call to action per view.
- Everything else is grayscale on near-black; rely on type weight and spacing for hierarchy.

## Typography

Lead with monospace for structure; use a clean sans for long-form body copy.

- Structural / headings / labels / data: `'Chivo Mono', ui-monospace, SFMono-Regular, Menlo, monospace`
- Body copy where needed: `'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Heading weights: 600-700
- Body weights: 400-500
- UI labels and badges: 500-600, often uppercase with slight letter-spacing
- Avoid condensed or decorative-serif pairings

## Layout Principles

- Favor near-black surfaces with subtle gray hairline borders over flat blocks
- Use generous spacing and short sections for readability
- Prefer clean cards, pill badges, and lightly elevated panels (`#141414`)
- Tables should be compact, scannable, and high contrast
- Code blocks should use a darker inset surface (`#000000`) than surrounding cards
- Border radius around `14px`; soft shadows only, no glow or gloss

## Content Patterns

For generated outputs:

- Lead with the most decision-relevant insight
- Quantify impact wherever possible
- Separate risks, opportunities, and next steps clearly
- Use short headings and structured sections
- Do not add decorative filler or marketing-style claims

## HTML Output Guidance

When a skill generates HTML:

- Use `'Chivo Mono'` (monospace) for headings, labels, and data; `'Roboto'` for body prose
- Keep backgrounds near-black: `#0a0a0a` for the canvas, `#141414` for raised cards
- Use `#ededed` for primary text and `#a1a1a1` for supporting copy
- Reserve the white accent (`#ffffff`) for the single highest-signal call to action
- Use `#2e2e2e` hairline borders; keep shadows soft and avoid glossy or glowing effects

## Example CSS Tokens

```css
:root {
  --backstory-accent: #ffffff;
  --backstory-bg: #0a0a0a;
  --backstory-surface: #141414;
  --backstory-inset: #000000;
  --backstory-border: #2e2e2e;
  --backstory-text: #ededed;
  --backstory-text-muted: #a1a1a1;
  --backstory-mono: 'Chivo Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  --backstory-sans: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

## Do / Don't

- Do use concise, executive-friendly layouts
- Do keep interfaces near-black and high contrast
- Do use white as the single accent and rely on type and spacing for hierarchy
- Don't use light-theme canvases by default
- Don't reintroduce indigo/purple or gradient accents
- Don't overload pages with multiple competing accent colors
