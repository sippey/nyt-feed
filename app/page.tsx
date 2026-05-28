import { unstable_noStore as noStore } from 'next/cache';
import { getTopicalFeeds } from '@/lib/feeds';
import { getFeedSnapshot } from '@/lib/kv';
import { FeedSection } from '@/components/FeedSection';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function HomePage() {
  // @vercel/kv uses fetch() internally; noStore() bypasses Next.js's data cache.
  // See CLAUDE.md "Caching gotcha".
  noStore();

  const feeds = getTopicalFeeds();
  const snapshots = await Promise.all(
    feeds.map(async (f) => ({ feed: f, snapshot: await getFeedSnapshot(f.slug) }))
  );

  return (
    <main className="main">
      {snapshots.map(({ feed, snapshot }) => (
        <FeedSection key={feed.slug} feed={feed} snapshot={snapshot} />
      ))}
    </main>
  );
}
