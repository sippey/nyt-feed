import { describe, it, expect } from 'vitest';
import { parseFeedsConfig, getFeeds, getTopicalFeeds } from '@/lib/feeds';

describe('parseFeedsConfig', () => {
  it('accepts a valid feeds array', () => {
    const input = [
      { slug: 'home', title: 'Home', url: 'https://example.com/home.xml' },
      { slug: 'biz', title: 'Business', url: 'https://example.com/biz.xml' }
    ];
    const result = parseFeedsConfig(input);
    expect(result).toHaveLength(2);
    expect(result[0].slug).toBe('home');
  });

  it('rejects an empty array', () => {
    expect(() => parseFeedsConfig([])).toThrow();
  });

  it('rejects an uppercase slug', () => {
    expect(() =>
      parseFeedsConfig([{ slug: 'Home', title: 'Home', url: 'https://x.com/a.xml' }])
    ).toThrow();
  });

  it('rejects a slug starting with a number', () => {
    expect(() =>
      parseFeedsConfig([{ slug: '1home', title: 'Home', url: 'https://x.com/a.xml' }])
    ).toThrow();
  });

  it('rejects duplicate slugs', () => {
    expect(() =>
      parseFeedsConfig([
        { slug: 'home', title: 'A', url: 'https://x.com/a.xml' },
        { slug: 'home', title: 'B', url: 'https://x.com/b.xml' }
      ])
    ).toThrow(/duplicate/i);
  });

  it('rejects an invalid URL', () => {
    expect(() =>
      parseFeedsConfig([{ slug: 'home', title: 'Home', url: 'not-a-url' }])
    ).toThrow();
  });

  it('rejects missing title', () => {
    expect(() =>
      parseFeedsConfig([{ slug: 'home', url: 'https://x.com/a.xml' }])
    ).toThrow();
  });

  it('getTopicalFeeds() excludes the "latest" slug', () => {
    const all = getFeeds();
    const topical = getTopicalFeeds();
    expect(topical.every((f) => f.slug !== 'latest')).toBe(true);
    // When 'latest' is present, topical is strictly smaller; when absent, they're equal.
    expect(topical.length).toBe(all.filter((f) => f.slug !== 'latest').length);
  });
});
