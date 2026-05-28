import { describe, it, expect } from 'vitest';
import { bucketByDay } from '@/lib/buckets';
import type { FeedItem } from '@/lib/types';

const EPOCH = new Date(0).toISOString();

function mk(pubDate: string, guid = pubDate): FeedItem {
  return {
    guid,
    title: 'T',
    link: 'https://x/g',
    description: '',
    byline: '',
    pubDate,
    image: null,
  };
}

describe('bucketByDay', () => {
  it('returns [] for empty input', () => {
    expect(bucketByDay([])).toEqual([]);
  });

  it('labels each day with "Weekday Month Day Year"', () => {
    // 2026-05-27 ET is a Wednesday
    const out = bucketByDay([mk('2026-05-27T15:00:00.000Z')]);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe('Wed May 27 2026');
  });

  it('groups multiple items from the same ET day under one bucket', () => {
    const items = [
      mk('2026-05-27T12:00:00.000Z', 'a'),
      mk('2026-05-27T15:00:00.000Z', 'b'),
    ];
    const out = bucketByDay(items);
    expect(out).toHaveLength(1);
    expect(out[0].items).toHaveLength(2);
  });

  it('formats labels for older dates with the same Weekday Month Day Year pattern', () => {
    // 2025-05-14 ET is a Wednesday
    const out = bucketByDay([mk('2025-05-14T15:00:00.000Z')]);
    expect(out).toHaveLength(1);
    expect(out[0].label).toBe('Wed May 14 2025');
  });

  it('routes epoch items to a trailing "Undated" bucket', () => {
    const items = [
      mk(EPOCH, 'bad'),
      mk('2026-05-27T15:00:00.000Z', 'good'),
    ];
    const out = bucketByDay(items);
    expect(out).toHaveLength(2);
    expect(out[0].label).toBe('Wed May 27 2026');
    expect(out[1].label).toBe('Undated');
    expect(out[1].key).toBe('undated');
    expect(out[1].items.map((i) => i.guid)).toEqual(['bad']);
  });

  it('preserves input order within each bucket', () => {
    const items = [
      mk('2026-05-27T15:00:00.000Z', 'first'),
      mk('2026-05-27T10:00:00.000Z', 'second'),
    ];
    const out = bucketByDay(items);
    expect(out[0].items.map((i) => i.guid)).toEqual(['first', 'second']);
  });

  it('emits buckets in descending day order', () => {
    const items = [
      mk('2026-05-24T15:00:00.000Z', 'older'),
      mk('2026-05-26T15:00:00.000Z', 'middle'),
      mk('2026-05-27T15:00:00.000Z', 'newer'),
    ];
    const out = bucketByDay(items);
    expect(out.map((b) => b.label)).toEqual([
      'Wed May 27 2026',
      'Tue May 26 2026',
      'Sun May 24 2026',
    ]);
  });

  it('does not emit empty buckets for days that fall between active days', () => {
    // May 24 and May 27 have items; May 25 and May 26 do not.
    const out = bucketByDay([
      mk('2026-05-24T15:00:00.000Z', 'older'),
      mk('2026-05-27T15:00:00.000Z', 'newer'),
    ]);
    expect(out.map((b) => b.label)).toEqual(['Wed May 27 2026', 'Sun May 24 2026']);
  });

  it('puts ET-midnight-crossing items in the correct day', () => {
    // 23:30 ET on 2026-05-26 = 03:30Z on 2026-05-27 (during EDT, UTC-4)
    // 00:30 ET on 2026-05-27 = 04:30Z on 2026-05-27
    const lateYesterday = mk('2026-05-27T03:30:00.000Z', 'lateYesterday');
    const earlyToday = mk('2026-05-27T04:30:00.000Z', 'earlyToday');
    const out = bucketByDay([earlyToday, lateYesterday]);
    const may27 = out.find((b) => b.label === 'Wed May 27 2026');
    const may26 = out.find((b) => b.label === 'Tue May 26 2026');
    expect(may27?.items.map((i) => i.guid)).toEqual(['earlyToday']);
    expect(may26?.items.map((i) => i.guid)).toEqual(['lateYesterday']);
  });
});
