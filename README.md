# NYT Feed

A clean, single-user reader for New York Times RSS feeds.

## Running locally

```bash
npm install
npm run dev
```

Visit <http://localhost:3000>. Without Vercel KV configured, the empty state is shown.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel. Framework auto-detects as Next.js.
3. Add the **Vercel KV** add-on to the project (free tier is plenty).
4. Add the environment variable `CRON_SECRET` (any long random string) under Project Settings → Environment Variables → Production. Vercel sends this as `Authorization: Bearer ${CRON_SECRET}` to the cron endpoint.
5. Deploy.
6. After the first deploy, trigger an initial cache fill:

```bash
curl -X POST -H "Authorization: Bearer <your CRON_SECRET>" \
  https://<your-deployment>.vercel.app/api/refresh
```

7. The Vercel Cron is configured in `vercel.json` to hit `/api/refresh` every 15 minutes.

## Adding or reordering feeds

Edit `config/feeds.json`. Array order = sidebar order. Each entry needs:

- `slug` — lowercase URL path, e.g. `business`
- `title` — sidebar / heading text
- `url` — RSS endpoint

Commit and push. Vercel rebuilds and the cron picks up the new feed on its next run.

## Tests

```bash
npm test
```

Tests cover: feeds config validation, RSS parsing (against a real snapshot in `tests/fixtures/`), relative time formatting, `/api/refresh` route with mocked fetch + KV, and the `FeedItem` read-state component.
