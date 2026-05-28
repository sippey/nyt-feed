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

const LABEL_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function labelForKey(key: string): string {
  // Anchor at noon UTC so the formatter (timeZone: 'UTC') always reports the same wall-clock day as the key.
  const noon = new Date(`${key}T12:00:00Z`);
  return LABEL_FMT.formatToParts(noon)
    .filter((p) => p.type !== 'literal')
    .map((p) => p.value)
    .join(' ');
}

export function bucketByDay(items: MergedItem[]): Bucket[] {
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
    label: labelForKey(key),
    items: dayMap.get(key)!,
  }));

  if (undated.length > 0) {
    result.push({ key: 'undated', label: 'Undated', items: undated });
  }

  return result;
}
