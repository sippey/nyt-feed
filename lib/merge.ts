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

export type Bucket = {
  key: string;
  label: string;
  items: MergedItem[];
};

const TZ = 'America/New_York';

function dayKeyET(d: Date): string {
  // en-CA gives YYYY-MM-DD; timeZone ensures we anchor to ET regardless of server tz.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function daysAgo(itemKey: string, nowKey: string): number {
  const item = Date.UTC(
    +itemKey.slice(0, 4),
    +itemKey.slice(5, 7) - 1,
    +itemKey.slice(8, 10),
  );
  const ref = Date.UTC(
    +nowKey.slice(0, 4),
    +nowKey.slice(5, 7) - 1,
    +nowKey.slice(8, 10),
  );
  return Math.round((ref - item) / 86400000);
}

function labelForKey(key: string, nowKey: string): string {
  const delta = daysAgo(key, nowKey);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Yesterday';
  // Anchor at noon UTC so the en-US formatter (timeZone: 'UTC') always reports the same wall-clock day.
  const noon = new Date(`${key}T12:00:00Z`);
  if (delta >= 2 && delta <= 6) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(noon);
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(noon);
}

export function bucketByDay(items: MergedItem[], now: Date): Bucket[] {
  const nowKey = dayKeyET(now);
  const dayMap = new Map<string, MergedItem[]>();
  const undated: MergedItem[] = [];

  for (const m of items) {
    if (m.item.pubDate === EPOCH_ISO) {
      undated.push(m);
      continue;
    }
    const key = dayKeyET(new Date(m.item.pubDate));
    const arr = dayMap.get(key);
    if (arr) arr.push(m);
    else dayMap.set(key, [m]);
  }

  const sortedKeys = [...dayMap.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  const result: Bucket[] = sortedKeys.map((key) => ({
    key,
    label: labelForKey(key, nowKey),
    items: dayMap.get(key)!,
  }));

  if (undated.length > 0) {
    result.push({ key: 'undated', label: 'Undated', items: undated });
  }

  return result;
}
