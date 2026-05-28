import { unstable_noStore as noStore } from 'next/cache';
import { getFeedBySlug } from '@/lib/feeds';
import { getFeedSnapshot } from '@/lib/kv';
import { bucketByDay } from '@/lib/buckets';
import { FeedItem } from '@/components/FeedItem';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function LatestPage() {
  // Same caching gotcha as app/page.tsx — see CLAUDE.md.
  noStore();

  const feed = getFeedBySlug('latest');
  const snapshot = feed ? await getFeedSnapshot(feed.slug) : null;
  const buckets = bucketByDay(snapshot?.items ?? []);

  return (
    <main className="main">
      {buckets.length === 0 ? (
        <div className="empty">No items yet.</div>
      ) : (
        buckets.map((b) => (
          <section key={b.key} className="day-section">
            <header className="day-head"><h2>{b.label}</h2></header>
            {b.items.map((item) => (
              <FeedItem key={item.guid} item={item} />
            ))}
          </section>
        ))
      )}
    </main>
  );
}
