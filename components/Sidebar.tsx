'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getTopicalFeeds } from '@/lib/feeds';
import { ReaderControls } from '@/components/ReaderControls';

type Props = {
  variant: 'desktop' | 'drawer';
  onNavigate?: () => void;
};

export function Sidebar({ variant, onNavigate }: Props) {
  const feeds = getTopicalFeeds();
  const pathname = usePathname();
  const isLatest = pathname === '/latest';
  const [activeSlug, setActiveSlug] = useState<string>(feeds[0].slug);

  useEffect(() => {
    // Per-section highlighting only makes sense on the home page where
    // .feed-section elements exist. On /latest the layout has .day-section
    // groupings instead, so we skip the observer entirely.
    if (isLatest) return;

    const sections = feeds
      .map((f) => document.getElementById(f.slug))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          setActiveSlug(visible[0].target.id);
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [feeds, isLatest]);

  const links = (
    <>
      <Link
        href="/latest"
        className={`nav-link nav-pinned ${isLatest ? 'active' : ''}`}
        onClick={onNavigate}
      >
        Latest
      </Link>
      {feeds.map((f) => (
        <a
          key={f.slug}
          href={isLatest ? `/#${f.slug}` : `#${f.slug}`}
          className={`nav-link ${!isLatest && f.slug === activeSlug ? 'active' : ''}`}
          onClick={onNavigate}
        >
          {f.title}
        </a>
      ))}
    </>
  );

  if (variant === 'drawer') {
    return <nav className="drawer-panel">{links}</nav>;
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-nav">{links}</div>
      <ReaderControls />
    </nav>
  );
}
