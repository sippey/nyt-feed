import type { FeedItem } from '@/lib/types';

export type Bucket = {
  key: string;
  label: string;
  items: FeedItem[];
};

const TZ = 'America/New_York';
const EPOCH_ISO = new Date(0).toISOString();

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

export function bucketByDay(items: FeedItem[]): Bucket[] {
  const dayMap = new Map<string, FeedItem[]>();
  const undated: FeedItem[] = [];

  for (const item of items) {
    if (item.pubDate === EPOCH_ISO) {
      undated.push(item);
      continue;
    }
    const key = dayKeyET(new Date(item.pubDate));
    const arr = dayMap.get(key);
    if (arr) arr.push(item);
    else dayMap.set(key, [item]);
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
