import Link from 'next/link';
import { getFeeds } from '@/lib/feeds';

type Props = {
  activeSlug: string;
  variant: 'desktop' | 'drawer';
  onNavigate?: () => void;
};

export function Sidebar({ activeSlug, variant, onNavigate }: Props) {
  const feeds = getFeeds();
  const showBrand = variant === 'desktop';

  return (
    <nav className={variant === 'desktop' ? 'sidebar' : 'drawer-panel'}>
      {showBrand && <div className="brand">NYT</div>}
      {feeds.map((f) => (
        <Link
          key={f.slug}
          href={`/${f.slug}`}
          className={`nav-link ${f.slug === activeSlug ? 'active' : ''}`}
          onClick={onNavigate}
        >
          {f.title}
        </Link>
      ))}
    </nav>
  );
}
