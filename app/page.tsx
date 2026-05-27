import { getFeeds } from '@/lib/feeds';
import { getFeedSnapshot } from '@/lib/kv';
import { Sidebar } from '@/components/Sidebar';
import { MobileTopBar } from '@/components/MobileTopBar';
import { FeedSection } from '@/components/FeedSection';
import { KeyboardNav } from '@/components/KeyboardNav';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
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
