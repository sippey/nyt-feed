import { NextResponse } from 'next/server';
import { getFeeds } from '@/lib/feeds';
import { parseRss } from '@/lib/rss';
import { setFeedSnapshot } from '@/lib/kv';
import type { FeedConfig } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const USER_AGENT = 'nyt-feed/1.0 (personal RSS reader)';
const FETCH_TIMEOUT_MS = 10_000;

type Result = { slug: string; status: 'ok' | 'error'; error?: string };

async function refreshOne(feed: FeedConfig): Promise<Result> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    });
    if (!res.ok) {
      return { slug: feed.slug, status: 'error', error: `HTTP ${res.status}` };
    }
    const xml = await res.text();
    const items = parseRss(xml);
    await setFeedSnapshot(feed.slug, { items, fetchedAt: new Date().toISOString() });
    return { slug: feed.slug, status: 'ok' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { slug: feed.slug, status: 'error', error: message };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const feeds = getFeeds();
  const results = await Promise.all(feeds.map(refreshOne));
  for (const r of results) {
    if (r.status === 'error') console.error(`[refresh] ${r.slug}: ${r.error}`);
  }
  return NextResponse.json({ ok: true, results });
}

export const GET = POST;
