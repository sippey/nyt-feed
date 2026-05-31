import { unstable_noStore as noStore } from 'next/cache';
import { getFeedBySlug } from '@/lib/feeds';
import { getFeedSnapshot } from '@/lib/kv';
import { sortByPubDateDesc } from '@/lib/time';
import { FeedItem } from '@/components/FeedItem';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function LatestPage() {
  // Same caching gotcha as app/page.tsx — see CLAUDE.md.
  noStore();

  const feed = getFeedBySlug('latest');
  const snapshot = feed ? await getFeedSnapshot(feed.slug) : null;
  const items = sortByPubDateDesc(snapshot?.items ?? []);

  return (
    <main className="main">
      {items.length === 0 ? (
        <div className="empty">No items yet.</div>
      ) : (
        items.map((item) => <FeedItem key={item.guid} item={item} />)
      )}
    </main>
  );
}
