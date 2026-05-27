# CLAUDE.md

Guidance for Claude (and any other agent) working in this repo. The README is
the user-facing doc — read that first. This file captures what's non-obvious
from skimming the code: conventions, gotchas, and the reasoning behind
specific choices.

## What this project is

A single-user, self-hosted reader for NYT RSS feeds, deployed on Vercel. There
is no auth, no multi-user state, no database beyond Vercel KV holding feed
snapshots. Optimize for the one user, not for generality.

## Mental model

Two execution surfaces:

1. **`/api/refresh`** (server, cron-driven). Hits NYT, parses XML, writes
   snapshots to KV. The only writer.
2. **`/` (RSC)** (server, render-time). Reads snapshots from KV, renders HTML.
   The only reader.

The browser never talks to NYT or to KV directly. Client components exist only
for interaction (read state, keyboard nav, sidebar highlighting, mobile
drawer); they never fetch.

This means: if the page looks stale, the bug is almost always in the refresh
path or in caching between KV and the SSR render — not in the client.

## Conventions

### Path aliases

`@/*` resolves to the repo root (configured in `tsconfig.json` and mirrored in
`vitest.config.mts`). Always use `@/lib/...`, `@/components/...` etc. in
imports — don't reach across the tree with relative paths.

### Styling

All CSS lives in `app/globals.css`. No CSS modules, no Tailwind, no
styled-components. Tokens are defined as CSS custom properties on `:root` with
a `prefers-color-scheme: dark` override. When adding UI, reuse the existing
tokens (`--bg`, `--fg`, `--fg-muted`, `--accent`, `--highlight`, etc.) rather
than introducing new colors.

The mobile breakpoint is `768px`. Below, the sidebar is hidden and the mobile
top bar + drawer show; above, it's the reverse.

### Fonts

`Newsreader` (serif) and `IBM Plex Sans` (sans) are loaded via `next/font` in
`app/layout.tsx` and exposed as `--font-serif` / `--font-sans`. Headlines and
the brand mark are serif; everything else is sans.

### Type sources of truth

`lib/types.ts` defines `FeedConfig`, `FeedItem`, `FeedSnapshot`. These are the
shapes that round-trip through KV — change them carefully because any existing
snapshot in production KV will be on the old shape until the next refresh.

## Caching gotcha (important)

`@vercel/kv` uses `fetch()` internally. Next.js's data cache will happily
memoize those responses across page renders on the same warm function
instance, which causes the page to render with a `fetchedAt` from minutes or
hours ago even after the cron has written fresh data.

The home page works around this with three directives in `app/page.tsx`:

```ts
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
// inside the component:
noStore();
```

If you add another page or another KV read path, replicate this pattern, or
the same bug will recur.

## The refresh route

`app/api/refresh/route.ts`:

- Accepts both `GET` and `POST` (Vercel Cron uses `GET`; manual triggering via
  curl uses `POST`). They're the same handler.
- Requires `Authorization: Bearer ${CRON_SECRET}`. If `CRON_SECRET` is unset,
  returns `500`; if the header doesn't match, returns `401`.
- Fetches all feeds in parallel with a 10s `AbortController` timeout and a
  custom `User-Agent`.
- Errors are **per-feed**, not fatal: one feed failing doesn't prevent others
  from updating. Failed feeds are logged to `console.error` and included in
  the response with `status: 'error'`.
- The response shape (`{ ok: true, results: [...] }`) intentionally omits
  diagnostic fields like HTTP status or error messages from the public payload
  — those go to logs only. Don't add them back.

## RSS parsing

`lib/rss.ts` uses `fast-xml-parser` with these decisions:

- `item`, `dc:creator`, `media:content`, and `category` are coerced to arrays
  (otherwise a single-element field comes back as a scalar).
- `byline` is built by joining all `dc:creator` entries with `, `.
- For images, prefer `media:content` with `medium="image"`, falling back to
  the first `media:content` entry. If neither exists, image is `null` and the
  thumbnail is omitted from the layout.
- Bad / missing dates parse to the Unix epoch (`new Date(0).toISOString()`)
  rather than throwing — the item still renders, just with a stale-looking
  timestamp. This is intentional: one malformed `<pubDate>` shouldn't blow up
  the whole feed.

If the channel doesn't have an `item` array at all, `parseRss` throws. The
caller (`refreshOne`) catches that and turns it into a per-feed error.

## Feed config

`config/feeds.json` is the only source of truth for which feeds exist.
`lib/feeds.ts` validates it with `zod`:

- Slugs must match `^[a-z][a-z0-9-]*$`.
- Slugs must be unique.
- At least one feed required.

`getFeeds()` caches the parsed result in module scope, so the validation runs
once per cold start. Don't add a "feeds API" — editing the JSON and
redeploying is the workflow.

## Read state

Lives entirely in `localStorage` under the key `nyt-feed:read`, stored as a
JSON array of guids. `FeedItem`:

- Reads from `localStorage` in a `useLayoutEffect` (not `useEffect`) so the
  read styling applies before paint and you don't see a flash of unread.
- Writes on link click via `onClick`, before the new tab opens. `target=_blank`
  + `rel=noopener noreferrer` means the new tab is fully detached.
- Silently swallows quota errors — read state is best-effort, not critical.

If you find yourself wanting "unread count" or "mark all read" or sync across
devices, talk to the user first. The current minimalism is a deliberate
choice.

## Keyboard navigation

`components/KeyboardNav.tsx` is the single source for all shortcuts. It works
by maintaining a `selectedRef` index into `document.querySelectorAll('.item')`
and toggling a `.selected` class. The selected item gets a left-edge highlight
(see `.item.selected` in CSS).

Quirks worth knowing:

- Typing inside an `<input>`, `<textarea>`, or contentEditable is detected and
  shortcuts are suppressed.
- `gg` requires two `g` presses within 500ms.
- `?` works both as the literal `?` key and as `Shift+/` (US layout fallback).
- When the help overlay is open, all other shortcuts are swallowed so the page
  doesn't scroll behind it.
- Clicks anywhere on an item sync the keyboard cursor to that item, so the
  next `j`/`k` continues from where the mouse landed.

If you add a shortcut, add it to both the `switch` block and the
`KeyboardHelp` overlay's `.kbd-list`.

## Sidebar active state

`components/Sidebar.tsx` uses `IntersectionObserver` with
`rootMargin: '-20% 0px -60% 0px'` to mark the most-visible section as active.
That margin band is what makes the active link match what's in the middle of
the viewport, not whatever has technically crossed the top edge.

## Testing

- Vitest with the `jsdom` environment.
- `tests/fixtures/home.xml` is a real captured NYT RSS response — keep it that
  way. If you need to test a particular shape, capture another fixture rather
  than hand-rolling one, so the tests stay grounded in what NYT actually
  emits.
- For `/api/refresh`, `fetch` and `@vercel/kv` are mocked. The mocked KV
  module also has to be reset between tests or state leaks across cases.
- For `FeedItem`, jsdom provides `localStorage`. Don't mock it; the real one
  works.

Run `npm test` before claiming a change is done; the RSS and refresh tests in
particular catch a lot of accidental regressions.

## Workflow expectations

- **No new dependencies without checking first.** The dep list is intentionally
  short (Next, React, KV, zod, fast-xml-parser). Adding anything else needs
  justification.
- **No new files unless necessary.** Prefer extending `globals.css`, existing
  components, or existing lib modules over creating parallel ones.
- **No comments narrating what code does.** The codebase keeps comments only
  for non-obvious *why* (e.g. the `noStore()` block, the date-fallback
  behavior). Match that style.
- **No `console.log` in committed code.** `console.error` in the refresh route
  is the one exception — it goes to Vercel logs.

## Things that are out of scope

Unless the user asks, don't:

- Add authentication, accounts, or any multi-user state.
- Add an admin UI for managing feeds. JSON + redeploy is the design.
- Add categories, tags, search, or filtering.
- Add server-side read state. localStorage is sufficient.
- Add analytics.
- Switch to a different RSS parser, CSS strategy, or framework.

If a request seems to push in one of these directions, surface that and ask
before implementing.
