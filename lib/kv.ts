import { kv } from '@vercel/kv';
import type { FeedSnapshot } from './types';

const key = (slug: string) => `feed:${slug}`;

export async function getFeedSnapshot(slug: string): Promise<FeedSnapshot | null> {
  return (await kv.get<FeedSnapshot>(key(slug))) ?? null;
}

export async function setFeedSnapshot(slug: string, snapshot: FeedSnapshot): Promise<void> {
  await kv.set(key(slug), snapshot);
}
