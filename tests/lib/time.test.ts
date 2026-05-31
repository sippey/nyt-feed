import { describe, it, expect } from 'vitest';
import { relativeTime, sortByPubDateDesc } from '@/lib/time';
import type { FeedItem } from '@/lib/types';

const EPOCH = new Date(0).toISOString();

function mkItem(pubDate: string, guid = pubDate): FeedItem {
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

const now = new Date('2026-05-26T12:00:00Z');

describe('relativeTime', () => {
  it('returns "just now" for < 1 min', () => {
    const t = new Date('2026-05-26T11:59:30Z').toISOString();
    expect(relativeTime(t, now)).toBe('just now');
  });

  it('returns minutes for < 1 hour', () => {
    const t = new Date('2026-05-26T11:43:00Z').toISOString();
    expect(relativeTime(t, now)).toBe('17m ago');
  });

  it('returns hours for < 24 hours', () => {
    const t = new Date('2026-05-26T08:00:00Z').toISOString();
    expect(relativeTime(t, now)).toBe('4h ago');
  });

  it('returns "yesterday" for 24-48 hours', () => {
    const t = new Date('2026-05-25T08:00:00Z').toISOString();
    expect(relativeTime(t, now)).toBe('yesterday');
  });

  it('returns a short date for older items', () => {
    const t = new Date('2026-05-22T12:00:00Z').toISOString();
    expect(relativeTime(t, now)).toBe('May 22');
  });

  it('returns "unknown" for invalid input', () => {
    expect(relativeTime('not-a-date', now)).toBe('unknown');
  });
});

describe('sortByPubDateDesc', () => {
  it('orders items newest-first', () => {
    const items = [
      mkItem('2026-05-30T10:00:00.000Z', 'older'),
      mkItem('2026-05-30T15:00:00.000Z', 'newer'),
      mkItem('2026-05-30T12:00:00.000Z', 'middle'),
    ];
    expect(sortByPubDateDesc(items).map((i) => i.guid)).toEqual([
      'newer',
      'middle',
      'older',
    ]);
  });

  it('sinks epoch / undated items to the bottom', () => {
    const items = [
      mkItem(EPOCH, 'undated'),
      mkItem('2026-05-30T10:00:00.000Z', 'dated'),
    ];
    expect(sortByPubDateDesc(items).map((i) => i.guid)).toEqual([
      'dated',
      'undated',
    ]);
  });

  it('keeps equal pubDates in input order (stable)', () => {
    const ts = '2026-05-30T10:00:00.000Z';
    const items = [mkItem(ts, 'first'), mkItem(ts, 'second'), mkItem(ts, 'third')];
    expect(sortByPubDateDesc(items).map((i) => i.guid)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('does not mutate the input array', () => {
    const items = [
      mkItem('2026-05-30T10:00:00.000Z', 'a'),
      mkItem('2026-05-30T15:00:00.000Z', 'b'),
    ];
    const before = items.map((i) => i.guid);
    sortByPubDateDesc(items);
    expect(items.map((i) => i.guid)).toEqual(before);
  });
});
