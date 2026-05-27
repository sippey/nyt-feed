import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseRss } from '@/lib/rss';

const fixture = readFileSync(
  path.join(__dirname, '../fixtures/home.xml'),
  'utf-8'
);

describe('parseRss', () => {
  it('returns a non-empty list of items', () => {
    const items = parseRss(fixture);
    expect(items.length).toBeGreaterThan(0);
  });

  it('maps required fields on every item', () => {
    const items = parseRss(fixture);
    for (const item of items) {
      expect(typeof item.guid).toBe('string');
      expect(item.guid.length).toBeGreaterThan(0);
      expect(typeof item.title).toBe('string');
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.link).toMatch(/^https?:\/\//);
      expect(typeof item.description).toBe('string');
      expect(typeof item.byline).toBe('string');
      expect(item.pubDate).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601
    }
  });

  it('extracts the image URL from <media:content> when present', () => {
    const items = parseRss(fixture);
    const withImage = items.filter((i) => i.image !== null);
    expect(withImage.length).toBeGreaterThan(0);
    expect(withImage[0].image).toMatch(/^https:\/\/static01\.nyt\.com\//);
  });

  it('handles an item with no image gracefully', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>Test</title>
        <link>https://example.com/a</link>
        <guid>https://example.com/a</guid>
        <description>Body</description>
        <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Jane Doe</dc:creator>
        <pubDate>Tue, 01 Apr 2025 12:00:00 +0000</pubDate>
      </item>
    </channel></rss>`;
    const items = parseRss(xml);
    expect(items).toHaveLength(1);
    expect(items[0].image).toBeNull();
    expect(items[0].byline).toBe('Jane Doe');
  });

  it('joins multiple dc:creator elements with ", "', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>Test</title>
        <link>https://example.com/a</link>
        <guid>https://example.com/a</guid>
        <description>Body</description>
        <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Alice</dc:creator>
        <dc:creator xmlns:dc="http://purl.org/dc/elements/1.1/">Bob</dc:creator>
        <pubDate>Tue, 01 Apr 2025 12:00:00 +0000</pubDate>
      </item>
    </channel></rss>`;
    const items = parseRss(xml);
    expect(items[0].byline).toBe('Alice, Bob');
  });

  it('throws on completely malformed input', () => {
    expect(() => parseRss('not xml at all')).toThrow();
  });
});
