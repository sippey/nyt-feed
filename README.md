# NYT Feed

A clean, single-user reader for New York Times RSS feeds. Built as a personal
project: minimal chrome, fast pages, vim-style keyboard navigation, and a
serif-forward design that gestures at the print product without copying it.

## Features

- **Multi-feed view.** Home Page, Business, Technology, Science, Arts, Book
  Review, and Travel render together in one continuous column with sticky
  section headers.
- **Read state.** Clicking a story link marks it read and dims it in place. State
  lives in `localStorage` under `nyt-feed:read`, so it's per-browser, no account
  required.
- **Keyboard navigation.** `j` / `k` to move, `o` or `Enter` to open in a new
  tab, `Space` / `Shift+Space` to page, `1`–`9` to jump to a section, `gg` /
  `Shift+G` for top / bottom, `?` to show the full cheat sheet.
- **Mobile drawer.** Below 768px the sidebar collapses behind a hamburger,
  preserving the same in-page anchor navigation.
- **Light + dark.** Color tokens flip automatically via
  `prefers-color-scheme`.
- **Cached via Vercel KV.** RSS fetches happen on a cron, not in the page
  render, so navigations are always fast and the NYT origin doesn't get hit on
  every load.

## Architecture in one paragraph

A Vercel Cron pings `/api/refresh` every 15 minutes. That route fetches each
configured feed, parses the XML, and writes a `FeedSnapshot` (items +
`fetchedAt`) into Vercel KV under `feed:<slug>`. The home page is an SSR React
Server Component that reads all snapshots out of KV and renders them. Client
components handle interaction only: read state, keyboard nav, sidebar
highlighting, mobile drawer.

```
Vercel Cron ──▶ POST /api/refresh ──▶ NYT RSS ──▶ parse ──▶ Vercel KV
                                                                 │
                                                                 ▼
                                            GET / (SSR) ◀── read snapshots
```

## Running locally

```bash
npm install
npm run dev
```

Visit <http://localhost:3000>. Without Vercel KV configured, every feed shows
"Feed not yet loaded." — the page still renders, it just has nothing to
display. To run end-to-end locally, set `KV_REST_API_URL` and
`KV_REST_API_TOKEN` from a real KV instance (see Vercel dashboard → Storage →
your KV → `.env.local`).

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel. The framework auto-detects as Next.js.
3. Add the **Vercel KV** add-on to the project (free tier is plenty for one
   user).
4. Add `CRON_SECRET` (any long random string) under Project Settings →
   Environment Variables → Production. Vercel sends this as
   `Authorization: Bearer ${CRON_SECRET}` to the cron endpoint, and the route
   rejects anything else with `401`.
5. Deploy.
6. After the first deploy, trigger an initial cache fill so the page has
   something to show:

   ```bash
   curl -X POST -H "Authorization: Bearer <your CRON_SECRET>" \
     https://<your-deployment>.vercel.app/api/refresh
   ```

7. The cron in `vercel.json` runs `/api/refresh` every 15 minutes from then on.

## Adding or reordering feeds

Edit `config/feeds.json`. Array order = sidebar order. Each entry needs:

- `slug` — lowercase URL-safe identifier, matches `^[a-z][a-z0-9-]*$`. Becomes
  the section anchor (`#business`) and the KV key (`feed:business`).
- `title` — sidebar label and section heading.
- `url` — the RSS endpoint.

Commit and push. Vercel rebuilds; the cron picks up the new feed on its next
run. To force the new feed to populate immediately, hit `/api/refresh` with the
bearer token as in step 6 above.

## Tests

```bash
npm test          # one-shot
npm run test:watch
```

Coverage:

- `tests/lib/feeds.test.ts` — config validation, slug regex, duplicate
  detection.
- `tests/lib/rss.test.ts` — parses a real captured response in
  `tests/fixtures/home.xml` so changes to NYT's RSS shape surface in CI.
- `tests/lib/time.test.ts` — boundary behavior of `relativeTime` (just now /
  minutes / hours / yesterday / dated).
- `tests/api/refresh.test.ts` — `/api/refresh` route with mocked `fetch` and
  KV, exercising auth, success, and per-feed failure isolation.
- `tests/components/FeedItem.test.tsx` — read-state persistence via
  `localStorage`.

## Project layout

```
app/
  layout.tsx          fonts + theme color
  page.tsx            SSR entry point — reads all snapshots, renders sections
  globals.css         all styling (single file, no CSS modules)
  api/refresh/route.ts cron-driven fetch + parse + KV write
components/
  FeedSection.tsx     section heading + items
  FeedItem.tsx        one story; owns read state
  Sidebar.tsx         in-page nav with IntersectionObserver active state
  MobileTopBar.tsx    sticky header + hamburger trigger
  MobileDrawer.tsx    slide-in sidebar for narrow viewports
  KeyboardNav.tsx     vim-style shortcuts + help overlay
lib/
  feeds.ts            zod-validated config loader
  rss.ts              fast-xml-parser → FeedItem[]
  kv.ts               Vercel KV read/write wrappers
  time.ts             relativeTime formatter
  types.ts            FeedConfig, FeedItem, FeedSnapshot
config/feeds.json     the feed list
tests/                vitest + jsdom
vercel.json           cron schedule
```

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Vercel KV ·
`fast-xml-parser` · `zod` · Vitest · Testing Library.

## A note on The New York Times

This project is not affiliated with, endorsed by, or sponsored by The New York
Times Company. It is a personal-use RSS reader that renders the publicly
available NYT RSS feeds. All article content, headlines, images, and
trademarks remain the property of The New York Times Company. If you fork
this and run your own copy, please be a good citizen: the 15-minute cron in
`vercel.json` is plenty for a single reader — don't crank it up, and keep the
identifying `User-Agent` in `app/api/refresh/route.ts` so NYT can see who's
calling.

## License

[MIT](./LICENSE). Do what you like with the code; the NYT content it
displays is not yours to relicense.
