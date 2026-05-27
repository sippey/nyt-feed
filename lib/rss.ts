import { XMLParser } from 'fast-xml-parser';
import type { FeedItem } from './types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['item', 'dc:creator', 'media:content', 'category'].includes(name)
});

type RawItem = {
  title?: string;
  link?: string;
  guid?: string | { '#text': string };
  description?: string;
  'dc:creator'?: string[];
  pubDate?: string;
  'media:content'?: Array<{ '@_url'?: string; '@_medium'?: string }>;
};

function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '#text' in value) {
    return String((value as { '#text': unknown })['#text']);
  }
  return '';
}

function isoFromRfc822(s: string | undefined): string {
  if (!s) return new Date(0).toISOString();
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return new Date(0).toISOString();
  return d.toISOString();
}

function pickImage(raw: RawItem): string | null {
  const media = raw['media:content'];
  if (!media || media.length === 0) return null;
  // Prefer medium="image", else first.
  const image = media.find((m) => m['@_medium'] === 'image') ?? media[0];
  return image['@_url'] ?? null;
}

export function parseRss(xml: string): FeedItem[] {
  const parsed = parser.parse(xml);
  const items: RawItem[] | undefined = parsed?.rss?.channel?.item;
  if (!Array.isArray(items)) {
    throw new Error('RSS parse error: missing channel.item array');
  }

  return items.map((raw): FeedItem => {
    const creators = raw['dc:creator'] ?? [];
    const byline = creators.map((c) => asText(c)).filter(Boolean).join(', ');
    return {
      guid: asText(raw.guid) || asText(raw.link),
      title: asText(raw.title),
      link: asText(raw.link),
      description: asText(raw.description),
      byline,
      pubDate: isoFromRfc822(asText(raw.pubDate)),
      image: pickImage(raw)
    };
  });
}
