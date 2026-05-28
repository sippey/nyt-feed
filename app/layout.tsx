import type { Metadata, Viewport } from 'next';
import { Newsreader, IBM_Plex_Sans } from 'next/font/google';
import { unstable_noStore as noStore } from 'next/cache';
import { getFeeds } from '@/lib/feeds';
import { getFeedSnapshot } from '@/lib/kv';
import { MobileTopBar } from '@/components/MobileTopBar';
import { Sidebar } from '@/components/Sidebar';
import { KeyboardNav } from '@/components/KeyboardNav';
import './globals.css';

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap'
});

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'NYT',
  description: 'A clean, simple reader for New York Times RSS feeds.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#efece4' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a17' }
  ]
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Same caching gotcha as the routes — KV reads must bypass the Next.js data cache.
  noStore();

  const feeds = getFeeds();
  const snapshots = await Promise.all(feeds.map((f) => getFeedSnapshot(f.slug)));
  const newestFetchedAt =
    snapshots
      .map((s) => s?.fetchedAt)
      .filter((t): t is string => Boolean(t))
      .sort()
      .at(-1) ?? null;

  return (
    <html lang="en" className={`${newsreader.variable} ${plex.variable}`}>
      <body>
        <MobileTopBar fetchedAt={newestFetchedAt} />
        <div className="layout">
          <Sidebar variant="desktop" />
          {children}
        </div>
        <KeyboardNav />
      </body>
    </html>
  );
}
