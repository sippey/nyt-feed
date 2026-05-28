import { describe, it, expect } from 'vitest';
import { bucketByDay, type MergedItem } from '@/lib/merge';
import type { FeedConfig, FeedItem } from '@/lib/types';

const home: FeedConfig = { slug: 'home', title: 'Home Page', url: 'https://x/h' };
const EPOCH = new Date(0).toISOString();

function mk(pubDate: string, guid = pubDate): MergedItem {
  const item: FeedItem = {
    guid,
    title: 'T',
    link: 'https://x/g',
    description: '',
    byline: '',
    pubDate,
    image: null,
  };
  return { item, feeds: [home] };
}

// 2026-05-27 ~ 8 AM ET (12:00Z is 08:00 ET in DST). Use this as the pinned "now".
const NOW = new Date('2026-05-27T12:00:00.000Z');

describe('bucketByDay', () => {
  it('returns [] for empty input', () => {
    expect(bucketByDay([], NOW)).toEqual([]);
  });

  it('labels same-ET-day as "Today"', () => {
    const items = [
      mk('2026-05-27T12:00:00.000Z', 'a'),
      mk('2026-05-27T15:00:00.000Z', 'b'),
    ];
    const out = bucketByDay(items, NOW);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe('Today');
    expect(out[0].items).toHaveLength(2);
  });

  it('labels prior ET day as "Yesterday"', () => {
    const out = bucketByDay([mk('2026-05-26T18:00:00.000Z')], NOW);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe('Yesterday');
  });

  it('labels 3 days ago with weekday + month + day', () => {
    // 2026-05-24 was a Sunday
    const out = bucketByDay([mk('2026-05-24T15:00:00.000Z')], NOW);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe('Sunday, May 24');
  });

  it('labels older items (>=7 days) with month + day + year', () => {
    const out = bucketByDay([mk('2025-05-14T15:00:00.000Z')], NOW);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe('May 14, 2025');
  });

  it('routes epoch items to a trailing "Undated" bucket', () => {
    const items = [
      mk(EPOCH, 'bad'),
      mk('2026-05-27T15:00:00.000Z', 'good'),
    ];
    const out = bucketByDay(items, NOW);
    expect(out).toHaveLength(2);
    expect(out[0].label).toBe('Today');
    expect(out[1].label).toBe('Undated');
    expect(out[1].key).toBe('undated');
    expect(out[1].items.map((m) => m.item.guid)).toEqual(['bad']);
  });

  it('preserves input order within each bucket', () => {
    const items = [
      mk('2026-05-27T15:00:00.000Z', 'first'),
      mk('2026-05-27T10:00:00.000Z', 'second'),
    ];
    const out = bucketByDay(items, NOW);
    expect(out[0].items.map((m) => m.item.guid)).toEqual(['first', 'second']);
  });

  it('emits buckets in descending day order', () => {
    const items = [
      mk('2026-05-24T15:00:00.000Z', 'older'),
      mk('2026-05-26T15:00:00.000Z', 'middle'),
      mk('2026-05-27T15:00:00.000Z', 'newer'),
    ];
    const out = bucketByDay(items, NOW);
    expect(out.map((b) => b.label)).toEqual(['Today', 'Yesterday', 'Sunday, May 24']);
  });

  it('does not emit empty buckets for days that fall between active days', () => {
    // May 24 and May 27 have items; May 25 and May 26 do not.
    const out = bucketByDay(
      [
        mk('2026-05-24T15:00:00.000Z', 'older'),
        mk('2026-05-27T15:00:00.000Z', 'newer'),
      ],
      NOW,
    );
    expect(out.map((b) => b.label)).toEqual(['Today', 'Sunday, May 24']);
  });

  it('puts ET-midnight-crossing items in the correct day', () => {
    // 23:30 ET on 2026-05-26 = 03:30Z on 2026-05-27 (during EDT, UTC-4)
    // 00:30 ET on 2026-05-27 = 04:30Z on 2026-05-27
    const lateYesterday = mk('2026-05-27T03:30:00.000Z', 'lateYesterday');
    const earlyToday = mk('2026-05-27T04:30:00.000Z', 'earlyToday');
    const out = bucketByDay([earlyToday, lateYesterday], NOW);
    const todayBucket = out.find((b) => b.label === 'Today');
    const yesterdayBucket = out.find((b) => b.label === 'Yesterday');
    expect(todayBucket?.items.map((m) => m.item.guid)).toEqual(['earlyToday']);
    expect(yesterdayBucket?.items.map((m) => m.item.guid)).toEqual(['lateYesterday']);
  });
});
