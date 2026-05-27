import { NextResponse } from 'next/server';
import { getFeeds } from '@/lib/feeds';
import { parseRss } from '@/lib/rss';
import { getFeedSnapshot, setFeedSnapshot } from '@/lib/kv';
import type { FeedConfig } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const USER_AGENT = 'nyt-feed/1.0 (personal RSS reader)';
const FETCH_TIMEOUT_MS = 10_000;

type Result = {
  slug: string;
  status: 'ok' | 'error';
  error?: string;
  writtenAt?: string;
  readBackFetchedAt?: string | null;
  itemCount?: number;
};

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
    const fetchedAt = new Date().toISOString();
    await setFeedSnapshot(feed.slug, { items, fetchedAt });
    // Diagnostic read-back: verify what we just wrote is what we can read.
    const readBack = await getFeedSnapshot(feed.slug);
    return {
      slug: feed.slug,
      status: 'ok',
      writtenAt: fetchedAt,
      readBackFetchedAt: readBack?.fetchedAt ?? null,
      itemCount: items.length
    };
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
  // Include the KV endpoint host (truncated, no secrets) so we can verify it
  // matches between this endpoint and the page renderer.
  const kvHost = (process.env.KV_REST_API_URL ?? '').replace(/^https?:\/\//, '').split('.')[0];
  return NextResponse.json({ ok: true, kvHost, now: new Date().toISOString(), results });
}

export const GET = POST;
