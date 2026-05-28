import { unstable_noStore as noStore } from 'next/cache';
import { getFeeds } from '@/lib/feeds';
import { getFeedSnapshot } from '@/lib/kv';
import { mergeFeedSnapshots, bucketByDay } from '@/lib/merge';
import { Sidebar } from '@/components/Sidebar';
import { MobileTopBar } from '@/components/MobileTopBar';
import { FeedItem } from '@/components/FeedItem';
import { KeyboardNav } from '@/components/KeyboardNav';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function LatestPage() {
  // Same caching gotcha as app/page.tsx — see CLAUDE.md.
  noStore();

  const feeds = getFeeds();
  const entries = await Promise.all(
    feeds.map(async (f) => ({ feed: f, snapshot: await getFeedSnapshot(f.slug) })),
  );

  const newestFetchedAt =
    entries
      .map((e) => e.snapshot?.fetchedAt)
      .filter((t): t is string => Boolean(t))
      .sort()
      .at(-1) ?? null;

  const merged = mergeFeedSnapshots(entries);
  const buckets = bucketByDay(merged, new Date());

  return (
    <>
      <MobileTopBar fetchedAt={newestFetchedAt} />
      <div className="layout">
        <Sidebar variant="desktop" />
        <main className="main">
          {buckets.length === 0 ? (
            <div className="empty">No items yet.</div>
          ) : (
            buckets.map((b) => (
              <section key={b.key} className="day-section">
                <header className="day-head">
                  <h2>{b.label}</h2>
                </header>
                {b.items.map((m) => (
                  <FeedItem key={m.item.guid} item={m.item} feeds={m.feeds} />
                ))}
              </section>
            ))
          )}
        </main>
      </div>
      <KeyboardNav />
    </>
  );
}
