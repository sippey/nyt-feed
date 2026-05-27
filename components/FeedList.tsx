import { FeedItem } from './FeedItem';
import { relativeTime } from '@/lib/time';
import type { FeedSnapshot } from '@/lib/types';

type Props = {
  title: string;
  snapshot: FeedSnapshot | null;
};

export function FeedList({ title, snapshot }: Props) {
  return (
    <div className="main">
      <header className="masthead">
        <h1>{title}</h1>
        {snapshot && <div className="updated">Updated {relativeTime(snapshot.fetchedAt)}</div>}
      </header>
      {snapshot ? (
        <div className="list">
          {snapshot.items.map((item) => (
            <FeedItem key={item.guid} item={item} />
          ))}
        </div>
      ) : (
        <div className="empty">
          Feed not yet loaded. The cron refreshes every 15 minutes — check back in a moment, or trigger a manual refresh via /api/refresh.
        </div>
      )}
    </div>
  );
}
