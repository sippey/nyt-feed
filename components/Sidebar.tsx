'use client';

import { useEffect, useState } from 'react';
import { getFeeds } from '@/lib/feeds';

type Props = {
  variant: 'desktop' | 'drawer';
  onNavigate?: () => void;
};

export function Sidebar({ variant, onNavigate }: Props) {
  const feeds = getFeeds();
  const [activeSlug, setActiveSlug] = useState<string>(feeds[0].slug);

  useEffect(() => {
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
  }, [feeds]);

  return (
    <nav className={variant === 'desktop' ? 'sidebar' : 'drawer-panel'}>
      {feeds.map((f) => (
        <a
          key={f.slug}
          href={`#${f.slug}`}
          className={`nav-link ${f.slug === activeSlug ? 'active' : ''}`}
          onClick={onNavigate}
        >
          {f.title}
        </a>
      ))}
    </nav>
  );
}
