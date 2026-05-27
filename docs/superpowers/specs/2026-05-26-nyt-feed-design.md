# NYT Feed — Design

**Date:** 2026-05-26
**Status:** Approved, ready for implementation planning
**Owner:** Michael Sippey

## Overview

A personal NYT reader that surfaces six section feeds from `rss.nytimes.com` as scannable lists with thumbnails. Read articles fade to ~45% opacity. Single-user, hosted on Vercel. Speed is the single most important quality — pages should feel instant.

### Goals

- Replace the visually noisy nytimes.com home page with a clean, scannable feed.
- Browse six section feeds: Home, Business, Technology, Science, Arts, Book Review.
- Track read/unread state visually with a simple fade.
- Look good on desktop and on a phone.
- Be fast on every visit (no cold round-trip to NYT on the request path).

### Non-goals (out of scope)

- Cross-device sync of read state
- Search or filtering within a feed
- "Mark all read" or "show unread only" controls
- Live/polling refresh (page reload only)
- Multi-user, auth, comments
- Displaying full article bodies — links go to nytimes.com in a new tab

## Architecture

```
┌──────────────────────────────┐        ┌─────────────────────┐
│  Vercel Cron (every 15 min)  │ ─────▶ │  /api/refresh route │
└──────────────────────────────┘        │  - fetch all 6 RSS  │
                                        │  - parse to JSON    │
                                        │  - write Vercel KV  │
                                        └──────────┬──────────┘
                                                   │
                                                   ▼
┌─────────────┐  GET /[slug]   ┌────────────────────────────────┐
│   Browser   │ ─────────────▶ │  Next.js page (Server Comp.)   │
│             │ ◀───────────── │  - read KV (no NYT round-trip) │
│             │   HTML+thumbs  │  - render full feed HTML       │
└─────────────┘                └────────────────────────────────┘
       │
       │ small client component
       ▼
  localStorage  ◀── tracks read GUIDs, fades items on render
```

### Why cron + KV (not ISR)

ISR's stale-while-revalidate is optimized for high-traffic sites where the next visitor benefits from a refresh triggered by the previous one. For a single user who checks a few times a day, ISR would show stale data on every visit and require a manual reload to get fresh data. Cron refreshes the cache whether the user is present or not, so first-load is always fresh (within the 15-min window).

### Components

- **Vercel Cron** — fires `/api/refresh` every 15 minutes.
- **`/api/refresh` route** — protected by `CRON_SECRET`. Fetches all 6 RSS feeds in parallel, parses each, writes a JSON blob per feed to Vercel KV. Never overwrites KV with a failed fetch.
- **`/[slug]` page** — Next.js server component reads from KV (no NYT call on the request path) and renders the full feed HTML. Same HTML for every visitor.
- **Client island** — a small component on each item that, on mount, applies the `.read` class for any item whose GUID is in localStorage. On link click, adds the GUID and fades the item.

## Tech stack

- **Framework:** Next.js (App Router) + TypeScript
- **Host:** Vercel
- **Cache:** Vercel KV
- **Cron:** Vercel Cron
- **RSS parser:** `fast-xml-parser`
- **Schema validation:** `zod` (for `feeds.json`)
- **Styling:** CSS modules or plain CSS (no framework needed at this scale)
- **Testing:** Vitest + Testing Library

## Feeds configuration

Single source of truth at `config/feeds.json`. Array order = sidebar order.

```json
[
  { "slug": "home",       "title": "Home",        "url": "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml" },
  { "slug": "business",   "title": "Business",    "url": "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml" },
  { "slug": "technology", "title": "Technology",  "url": "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml" },
  { "slug": "science",    "title": "Science",     "url": "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml" },
  { "slug": "arts",       "title": "Arts",        "url": "https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml" },
  { "slug": "books",      "title": "Book Review", "url": "https://rss.nytimes.com/services/xml/rss/nyt/Books/Review.xml" }
]
```

**Schema (enforced via Zod at import time):**

- `slug` — string, lowercase, URL-safe (`/^[a-z][a-z0-9-]*$/`). Used as the URL path and the KV key suffix (`feed:<slug>`).
- `title` — string. Used in the sidebar and as the page heading.
- `url` — valid URL string.
- Array of 1+ entries. Slugs must be unique.

**Updating feeds:** edit `config/feeds.json`, commit, push. Vercel rebuilds; the cron picks up the new feed on its next run; the sidebar grows by one entry.

## Page structure & routes

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Redirects to `/{firstFeed.slug}` (currently `/home`) |
| `/[slug]` | GET | Renders one feed's items |
| `/api/refresh` | POST | Cron-only. Fetches all feeds, writes to KV. Auth: `Authorization: Bearer ${CRON_SECRET}` |

**Layout:**

- **Desktop (≥768px):** persistent left sidebar (~180px wide), main column on the right. No top bar.
- **Mobile (<768px):** sidebar hidden behind a clearly visible `☰` button (≥44×44px tap target) in a top bar. Tapping the button slides the sidebar in from the left over a dimmed scrim; tapping the scrim closes it.
- **Active feed** is highlighted in the sidebar with blue text and a 3px blue left border.

**File structure:**

```
app/
  layout.tsx              # root layout, theme provider
  page.tsx                # redirects to /home
  [slug]/page.tsx         # server component, reads KV, renders feed
  api/refresh/route.ts    # cron handler
components/
  Sidebar.tsx             # nav, used on desktop and inside the mobile drawer
  MobileTopBar.tsx        # ☰ button + brand + timestamp
  MobileDrawer.tsx        # slide-in wrapper around <Sidebar />
  FeedList.tsx            # the list rendering
  FeedItem.tsx            # single item; client component for read state
config/
  feeds.json
lib/
  feeds.ts                # parse feeds.json, Zod schema
  rss.ts                  # fetch + parse RSS to typed objects
  kv.ts                   # KV helpers (typed get/set with `feed:<slug>` keys)
tests/
  fixtures/               # snapshotted RSS XML for parser tests
vercel.json               # cron config
```

## Visual design

### Typography & color (light mode)

- Font stack: `-apple-system, "Inter", "Helvetica Neue", Arial, sans-serif`
- Headlines: 15.5px, weight 600, color `#0a58ca` (unread blue)
- Byline + time: 11.5px, color `#888`
- Description: 13.5px, color `#555`
- Page background: `#fff`
- Item separators: 1px `#f0f0f0`
- Sidebar background: `#fafafa`, right border `#ececec`
- Active sidebar item: white background, blue text (`#0a58ca`), 3px blue left border

### Item layout

- Row layout: text column on the left, thumbnail on the right
- Thumbnail: 88×88px on desktop, 64×64px on mobile, 2px corner radius
- Inside the text column, stacked: title → byline + time → description
- 14–16px vertical padding between items
- Links open in a new tab (`target="_blank" rel="noopener noreferrer"`)

### Masthead (top of main column)

- Section title (e.g., "Home", "Business"): 22px, weight 600
- "Updated N min ago" below the title: 11px, `#888`. Renders from `fetchedAt` stored in KV.

### Read state

- The entire item drops to `opacity: 0.45`
- Title text also shifts to `#6a6a6a` (color-blind safe; opacity alone would be ambiguous)
- Transition: `opacity 200ms ease`

### Feed item field mapping

| UI field | RSS source |
|---|---|
| Title | `<title>` |
| Link | `<link>` (open in new tab) |
| Byline | `<dc:creator>` — the NYT feed joins multiple authors inside a single element (e.g. "A, B and C"), so use the value as-is. If the parser ever returns an array (multiple elements), join with `", "`. |
| Time | `<pubDate>` — formatted as relative ("2h ago", "yesterday", or "May 24") at render time |
| Description | `<description>` |
| Thumbnail | `<media:content url="...">` — first one, used directly (NYT CDN allows hotlinking) |
| Read-tracking ID | `<guid>` (already a permalink) |

## Dark mode

Follows system preference via `prefers-color-scheme: dark`. No toggle.

| Element | Light | Dark |
|---|---|---|
| Page background | `#fff` | `#111` |
| Sidebar background | `#fafafa` | `#0d0d0d` |
| Sidebar border | `#ececec` | `#222` |
| Item separators | `#f0f0f0` | `#222` |
| Headlines (unread) | `#0a58ca` | `#7aa9ff` |
| Headlines (read) | `#6a6a6a` | `#6a6a6a` |
| Byline + time | `#888` | `#888` |
| Description | `#555` | `#bbb` |
| Read-state opacity | `0.45` | `0.45` |

## Read state implementation

### Storage

```
localStorage key:   nyt-feed:read
localStorage value: JSON.stringify(string[])  // array of GUIDs (deduped)
```

A single key for all feeds. An article that appears in two feeds (e.g., a politics story on both Home and Business) shows as read in both.

### Behavior

- On client mount, parse the array into a `Set<string>`.
- For each rendered item, if its GUID is in the set, add the `.read` class.
- On link click, add the GUID to the set, persist to localStorage, let the default `target="_blank"` behavior open the article. Do **not** call `preventDefault` — the click and the storage write race, but localStorage writes are synchronous so the order is deterministic.
- No cleanup of stale GUIDs. Worst-case growth is ~6 feeds × ~30 items × ~100 bytes/GUID ≈ 18KB. Not worth pruning.

### Avoiding the flash of unfaded items

The server renders all items without the `.read` class (it has no knowledge of localStorage). To prevent a visible flash:

- The `FeedItem` client component reads `nyt-feed:read` in `useLayoutEffect` (synchronous, before paint) and applies the class.
- The `.read` style uses a `transition` on opacity, so once the class is applied, future toggles (on click) animate; the initial application happens before first paint and is instant.

## Cron + RSS handling

### `/api/refresh` route

Method: POST. Auth: requires `Authorization: Bearer ${process.env.CRON_SECRET}`.

```
1. Import config/feeds.json (validated by Zod at module load).
2. For each feed, in parallel (Promise.allSettled):
   a. fetch(url) with User-Agent "nyt-feed/1.0 (personal RSS reader)" and 10s timeout
   b. Parse XML via fast-xml-parser
   c. Map items to:
      { guid: string, title: string, link: string, description: string,
        byline: string, pubDate: string, image: string | null }
   d. kv.set(`feed:${slug}`, { items, fetchedAt: new Date().toISOString() })
3. For any failed feed: log the error. Do NOT overwrite KV — keep the last good copy.
4. Return JSON: { ok: true, results: [{ slug, status: "ok" | "error", error?: string }] }
```

### Cron schedule (`vercel.json`)

```json
{
  "crons": [
    { "path": "/api/refresh", "schedule": "*/15 * * * *" }
  ]
}
```

### Page rendering (`/[slug]/page.tsx`)

1. Look up the feed config by slug from `feeds.json`. 404 if not found.
2. `kv.get<FeedSnapshot>(\`feed:\${slug}\`)`. If null, render an empty state ("Feed not yet loaded — try again in a moment").
3. Render `<Sidebar />`, `<MobileTopBar />`, `<MobileDrawer />`, and `<FeedList items={snapshot.items} updatedAt={snapshot.fetchedAt} />`.

### Failure modes

| Failure | Behavior |
|---|---|
| NYT 5xx / timeout | Cron keeps prior KV entry. "Updated N min ago" grows. |
| KV write error | `/api/refresh` returns 500; logged. Page still serves last good copy. |
| Cron skipped | Same as NYT failure — "Updated" timestamp ages. |
| KV empty on first deploy | Page shows empty state. Cron fills it within 15 min, or hit `/api/refresh` manually after deploy. |
| `feeds.json` invalid | Zod throws at module load → build fails. Bad config never ships. |

## Testing

- **`lib/rss.ts`** — unit tests against fixture XML files committed to `tests/fixtures/`. Snapshot the real feeds once so changes to NYT's RSS schema surface as failing tests.
- **`lib/feeds.ts`** — unit tests for the Zod schema: rejects bad slugs, duplicate slugs, missing fields, invalid URLs.
- **`/api/refresh`** — integration test with mocked `fetch` and KV. Asserts the right keys are written; asserts a partial failure (one feed errors) doesn't overwrite that slug's KV entry.
- **`FeedItem`** — component test with Testing Library. Mounts with no localStorage → not faded. Mounts with GUID in localStorage → faded. Click adds GUID to localStorage.
- **Manual smoke test in the browser** for the integration story. No automated E2E at this scale.

## Risks / open considerations

- **NYT blocks the cron's User-Agent.** Set an explicit `User-Agent: nyt-feed/1.0 (personal RSS reader)` on the cron's `fetch`. If they ever block us anyway, swap to a more browser-like UA.
- **Image hotlinking breaks.** NYT's CDN currently serves images with permissive CORS. If that changes, add a small `/api/img?url=…` proxy that streams the bytes through Vercel. Not building this preemptively.
- **Vercel KV free-tier limits.** 30k commands/day. Cron uses ~6 reads + 6 writes per run × 96 runs/day ≈ 1,200 commands/day. Comfortably under.
- **Single point of failure on KV.** Mitigation is graceful: on KV miss, the page shows an empty state with a helpful message rather than erroring.
- **GUID stability assumption.** This design assumes `<guid>` values for NYT articles are stable across feed refreshes (so an article marked read stays marked). Spot-check during implementation; if NYT regenerates GUIDs, fall back to `<link>` as the read-tracking ID.

## Environment variables

| Variable | Purpose | Set in |
|---|---|---|
| `CRON_SECRET` | Bearer token for `/api/refresh` | Vercel project settings (Production) |
| `KV_REST_API_URL` | Vercel KV endpoint | Auto-provided by KV add-on |
| `KV_REST_API_TOKEN` | Vercel KV credential | Auto-provided by KV add-on |
| `KV_REST_API_READ_ONLY_TOKEN` | Vercel KV read-only credential | Auto-provided by KV add-on |
