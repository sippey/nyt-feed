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
