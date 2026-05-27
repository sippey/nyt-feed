# Visual Redesign — Greige + Moss

**Date:** 2026-05-26
**Status:** Approved
**Scope:** Visual layer only. No changes to layout structure, routing, components, data flow, or behavior.

## Goal

Move from the wireframe-y modern-sans look to a more readable, scannable, distinctive feed: editorial serif headlines on a warm neutral background with a single moss-green accent. Same app, better dressed.

## Decisions

### Typefaces

- **Newsreader** (Google Fonts, variable serif optimized for screen reading) — used for item titles, the sidebar brand, and any other "display" copy.
- **IBM Plex Sans** (Google Fonts) — used for descriptions, byline + time metadata, section labels, and UI chrome.
- Drop Inter. The font stack becomes `Newsreader` for the serif and `IBM Plex Sans` for the sans; both are loaded via `next/font/google` with the existing CSS-variable pattern.

### Palette

#### Light mode

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#efece4` | Page + sidebar background (cool greige, not warm cream) |
| `--fg` | `#1c1c19` | Primary text (titles, brand) |
| `--fg-muted` | `#4d4d45` | Description body text |
| `--fg-meta` | `#8f8c80` | "Updated N min ago" timestamps |
| `--fg-read` | (same as `--fg-muted`) | Read-state title color (also still uses opacity 0.45) |
| `--border` | `#d8d4c6` | Sidebar right border, masthead rule |
| `--separator` | `#d8d4c6` | Item separators (same as border for consistency) |
| `--bg-active` | `#e2dec8` | Sidebar active item background, item hover background |
| `--accent` | `#4a5c2f` | Section label color, section-label underline, byline color |

#### Dark mode

| Token | Value | Used for |
|---|---|---|
| `--bg` | `#1a1a17` | Page + sidebar background (warm-neutral dark, not pure black) |
| `--fg` | `#ece9df` | Primary text |
| `--fg-muted` | `#b3b0a3` | Description body |
| `--fg-meta` | `#908d82` | Timestamps |
| `--border` | `#2c2c27` | Borders + rules |
| `--separator` | `#2c2c27` | Item separators |
| `--bg-active` | `#26241f` | Active sidebar + hover |
| `--accent` | `#9ab063` | Section label, byline (lighter sage to remain visible on dark) |

The accent shifts up the value scale in dark mode (`#4a5c2f` → `#9ab063`) so the moss reads on the dark background. Background and foreground mirror each other in hue across the two modes — no jarring shift in color temperature when the OS toggles.

### Type treatment

- **Item title** — Newsreader, 18px, weight 500, line-height 1.2, color `--fg`.
- **Byline + time** — IBM Plex Sans, 11px, weight 500, color `--accent` (moss), letter-spacing 0.2px.
- **Description** — IBM Plex Sans, 13px, weight 400, line-height 1.55, color `--fg-muted`. Not italic.
- **Section label** — IBM Plex Sans, 11px, weight 600, uppercase, letter-spacing 2.5px, color `--accent`, with a 1px underline in `--accent`. Replaces the previous bold "Home" heading style. Sits inline, not stretched.
- **Sidebar brand** — Newsreader, 17px, weight 500. Same in desktop sidebar and mobile drawer.
- **Sidebar nav links** — IBM Plex Sans, 13.5px, weight 500 inactive / 600 active. Active item: `--bg-active` background, full `--fg` color (no blue, no left border).
- **Mobile topbar brand** — Newsreader, matching the sidebar.

### Other

- Drop the `--link` token; the global `a { color: inherit; }` continues to work since item titles inherit from the article's color.
- Keep all other layout decisions: 800px max-width, 12px item inset, 6px border-radius, 120ms hover transition, fade-on-read at 0.45 opacity, sticky desktop sidebar, hamburger drawer on mobile, in-page anchor scrolling between sections.

## Out of scope

- No content changes, no routing changes, no behavioral changes.
- No new sections, no new UI elements.
- No A/B variants in the same build — single visual design.

## Verification

- `npm test` — 32 tests still passing.
- `npm run build` — clean build, Newsreader + IBM Plex Sans fetched successfully.
- Vercel preview deploy on `feat/design-exploration` for visual verification.
