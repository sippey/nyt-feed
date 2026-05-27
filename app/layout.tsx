import type { Metadata, Viewport } from 'next';
import { Newsreader, IBM_Plex_Sans } from 'next/font/google';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${plex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
