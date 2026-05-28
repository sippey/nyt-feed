import { describe, it, expect } from 'vitest';
import { mergeFeedSnapshots, type MergedItem } from '@/lib/merge';
import type { FeedConfig, FeedItem, FeedSnapshot } from '@/lib/types';

const home: FeedConfig = { slug: 'home', title: 'Home Page', url: 'https://x/h' };
const biz: FeedConfig = { slug: 'business', title: 'Business', url: 'https://x/b' };
const tech: FeedConfig = { slug: 'technology', title: 'Technology', url: 'https://x/t' };

const EPOCH = new Date(0).toISOString();

function makeItem(over: Partial<FeedItem> = {}): FeedItem {
  return {
    guid: 'g',
    title: 'T',
    link: 'https://x/g',
    description: '',
    byline: '',
    pubDate: '2026-05-27T12:00:00.000Z',
    image: null,
    ...over,
  };
}

function snap(items: FeedItem[]): FeedSnapshot {
  return { items, fetchedAt: '2026-05-27T13:00:00.000Z' };
}

describe('mergeFeedSnapshots', () => {
  it('returns [] for empty input', () => {
    expect(mergeFeedSnapshots([])).toEqual([]);
  });

  it('returns [] when every snapshot is null', () => {
    const out = mergeFeedSnapshots([
      { feed: home, snapshot: null },
      { feed: biz, snapshot: null },
    ]);
    expect(out).toEqual([]);
  });

  it('passes single-feed items through with a single-element feeds array', () => {
    const a = makeItem({ guid: 'a', pubDate: '2026-05-27T10:00:00.000Z' });
    const b = makeItem({ guid: 'b', pubDate: '2026-05-27T11:00:00.000Z' });
    const out = mergeFeedSnapshots([{ feed: home, snapshot: snap([a, b]) }]);
    expect(out).toHaveLength(2);
    expect(out[0].item.guid).toBe('b');
    expect(out[0].feeds).toEqual([home]);
    expect(out[1].item.guid).toBe('a');
    expect(out[1].feeds).toEqual([home]);
  });

  it('dedupes by guid and collects every feed it appeared in, in input order', () => {
    const shared = makeItem({ guid: 'shared', pubDate: '2026-05-27T10:00:00.000Z' });
    const out = mergeFeedSnapshots([
      { feed: home, snapshot: snap([shared]) },
      { feed: biz, snapshot: snap([shared]) },
      { feed: tech, snapshot: snap([shared]) },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].item.guid).toBe('shared');
    expect(out[0].feeds.map((f) => f.slug)).toEqual(['home', 'business', 'technology']);
  });

  it('keeps the first occurrence\'s metadata when title/desc differ across feeds', () => {
    const first = makeItem({ guid: 'g1', title: 'First', description: 'd1' });
    const second = makeItem({ guid: 'g1', title: 'Second', description: 'd2' });
    const out = mergeFeedSnapshots([
      { feed: home, snapshot: snap([first]) },
      { feed: biz, snapshot: snap([second]) },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].item.title).toBe('First');
    expect(out[0].item.description).toBe('d1');
  });

  it('keeps the earliest non-epoch pubDate when they differ', () => {
    const later = makeItem({ guid: 'g1', pubDate: '2026-05-27T12:00:00.000Z' });
    const earlier = makeItem({ guid: 'g1', pubDate: '2026-05-27T08:00:00.000Z' });
    const out = mergeFeedSnapshots([
      { feed: home, snapshot: snap([later]) },
      { feed: biz, snapshot: snap([earlier]) },
    ]);
    expect(out[0].item.pubDate).toBe('2026-05-27T08:00:00.000Z');
  });

  it('replaces an epoch pubDate with a real one from a later feed', () => {
    const bad = makeItem({ guid: 'g1', pubDate: EPOCH });
    const good = makeItem({ guid: 'g1', pubDate: '2026-05-27T08:00:00.000Z' });
    const out = mergeFeedSnapshots([
      { feed: home, snapshot: snap([bad]) },
      { feed: biz, snapshot: snap([good]) },
    ]);
    expect(out[0].item.pubDate).toBe('2026-05-27T08:00:00.000Z');
  });

  it('keeps epoch pubDate items in output (does not filter)', () => {
    const bad = makeItem({ guid: 'g1', pubDate: EPOCH });
    const out = mergeFeedSnapshots([{ feed: home, snapshot: snap([bad]) }]);
    expect(out).toHaveLength(1);
    expect(out[0].item.pubDate).toBe(EPOCH);
  });

  it('sorts the result newest-first by pubDate across feeds', () => {
    const a = makeItem({ guid: 'a', pubDate: '2026-05-25T10:00:00.000Z' });
    const b = makeItem({ guid: 'b', pubDate: '2026-05-27T10:00:00.000Z' });
    const c = makeItem({ guid: 'c', pubDate: '2026-05-26T10:00:00.000Z' });
    const out = mergeFeedSnapshots([
      { feed: home, snapshot: snap([a]) },
      { feed: biz, snapshot: snap([b, c]) },
    ]);
    expect(out.map((m) => m.item.guid)).toEqual(['b', 'c', 'a']);
  });

  it('tolerates a null snapshot mixed with real snapshots', () => {
    const a = makeItem({ guid: 'a' });
    const out = mergeFeedSnapshots([
      { feed: home, snapshot: null },
      { feed: biz, snapshot: snap([a]) },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].feeds).toEqual([biz]);
  });
});
