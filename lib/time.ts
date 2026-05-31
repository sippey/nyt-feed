import type { FeedItem } from '@/lib/types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 'unknown';

  const diffMs = now.getTime() - then.getTime();
  const min = Math.floor(diffMs / 60000);

  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  if (hr < 48) return 'yesterday';

  return `${MONTHS[then.getUTCMonth()]} ${then.getUTCDate()}`;
}

export function sortByPubDateDesc(items: FeedItem[]): FeedItem[] {
  // pubDate is always an ISO-8601 UTC string, so string compare is chronological;
  // epoch-fallback dates ("1970-…") sort last. Copy first — don't mutate the input.
  return [...items].sort((a, b) =>
    a.pubDate < b.pubDate ? 1 : a.pubDate > b.pubDate ? -1 : 0
  );
}
