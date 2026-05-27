export type FeedConfig = {
  slug: string;
  title: string;
  url: string;
};

export type FeedItem = {
  guid: string;
  title: string;
  link: string;
  description: string;
  byline: string;
  pubDate: string;          // ISO 8601
  image: string | null;     // absolute URL or null if missing
};

export type FeedSnapshot = {
  items: FeedItem[];
  fetchedAt: string;        // ISO 8601
};
