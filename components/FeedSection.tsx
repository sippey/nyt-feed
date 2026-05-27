import { FeedItem } from './FeedItem';
import { relativeTime } from '@/lib/time';
import type { FeedConfig, FeedSnapshot } from '@/lib/types';

type Props = {
  feed: FeedConfig;
  snapshot: FeedSnapshot | null;
};

export function FeedSection({ feed, snapshot }: Props) {
  return (
    <section id={feed.slug} className="feed-section">
      <header className="section-head">
        <h2>{feed.title}</h2>
        {snapshot && <div className="updated">Updated {relativeTime(snapshot.fetchedAt)}</div>}
      </header>
      {snapshot ? (
        snapshot.items.map((item) => <FeedItem key={item.guid} item={item} />)
      ) : (
        <div className="empty">Feed not yet loaded.</div>
      )}
    </section>
  );
}
