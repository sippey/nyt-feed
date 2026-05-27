import { z } from 'zod';
import type { FeedConfig } from './types';

const slugSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, 'slug must be lowercase, start with a letter, and contain only [a-z0-9-]');

const feedSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1),
  url: z.string().url()
});

const feedsSchema = z
  .array(feedSchema)
  .min(1, 'at least one feed is required')
  .superRefine((feeds, ctx) => {
    const seen = new Set<string>();
    for (const f of feeds) {
      if (seen.has(f.slug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate slug: ${f.slug}`,
          path: [feeds.indexOf(f), 'slug']
        });
      }
      seen.add(f.slug);
    }
  });

export function parseFeedsConfig(input: unknown): FeedConfig[] {
  return feedsSchema.parse(input);
}

import feedsJson from '@/config/feeds.json';

let cached: FeedConfig[] | null = null;

export function getFeeds(): FeedConfig[] {
  if (!cached) cached = parseFeedsConfig(feedsJson);
  return cached;
}

export function getFeedBySlug(slug: string): FeedConfig | undefined {
  return getFeeds().find((f) => f.slug === slug);
}
