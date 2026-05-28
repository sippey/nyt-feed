import type { FeedConfig, FeedItem, FeedSnapshot } from '@/lib/types';

export type MergedItem = {
  item: FeedItem;
  feeds: FeedConfig[];
};

const EPOCH_ISO = new Date(0).toISOString();

export function mergeFeedSnapshots(
  entries: { feed: FeedConfig; snapshot: FeedSnapshot | null }[],
): MergedItem[] {
  const byGuid = new Map<string, MergedItem>();

  for (const { feed, snapshot } of entries) {
    if (!snapshot) continue;
    for (const item of snapshot.items) {
      const existing = byGuid.get(item.guid);
      if (!existing) {
        byGuid.set(item.guid, { item, feeds: [feed] });
        continue;
      }
      existing.feeds.push(feed);
      // Prefer the earliest non-epoch pubDate across feeds — first publication wins.
      const hasReal = existing.item.pubDate !== EPOCH_ISO;
      const incomingReal = item.pubDate !== EPOCH_ISO;
      if (incomingReal && (!hasReal || item.pubDate < existing.item.pubDate)) {
        existing.item = { ...existing.item, pubDate: item.pubDate };
      }
    }
  }

  return [...byGuid.values()].sort((a, b) => {
    if (a.item.pubDate > b.item.pubDate) return -1;
    if (a.item.pubDate < b.item.pubDate) return 1;
    return 0;
  });
}
