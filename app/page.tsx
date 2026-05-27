import { unstable_noStore as noStore } from 'next/cache';
import { getFeeds } from '@/lib/feeds';
import { getFeedSnapshot } from '@/lib/kv';
import { Sidebar } from '@/components/Sidebar';
import { MobileTopBar } from '@/components/MobileTopBar';
import { FeedSection } from '@/components/FeedSection';
import { KeyboardNav } from '@/components/KeyboardNav';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function HomePage() {
  // @vercel/kv uses fetch() internally to talk to Upstash. Without explicit
  // opt-out, Next.js's data cache holds those responses across requests on the
  // same warm function instance, so the page renders stale fetchedAt even after
  // the cron has written fresh data. noStore() forces every fetch in this
  // render to bypass the cache.
  noStore();

  const feeds = getFeeds();
  const snapshots = await Promise.all(
    feeds.map(async (f) => ({ feed: f, snapshot: await getFeedSnapshot(f.slug) }))
  );

  const newestFetchedAt = snapshots
    .map((s) => s.snapshot?.fetchedAt)
    .filter((t): t is string => Boolean(t))
    .sort()
    .at(-1) ?? null;

  return (
    <>
      <MobileTopBar fetchedAt={newestFetchedAt} />
      <div className="layout">
        <Sidebar variant="desktop" />
        <main className="main">
          {snapshots.map(({ feed, snapshot }) => (
            <FeedSection key={feed.slug} feed={feed} snapshot={snapshot} />
          ))}
        </main>
      </div>
      <KeyboardNav />
    </>
  );
}
