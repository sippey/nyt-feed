import { notFound } from 'next/navigation';
import { getFeedBySlug, getFeeds } from '@/lib/feeds';
import { getFeedSnapshot } from '@/lib/kv';
import { Sidebar } from '@/components/Sidebar';
import { MobileTopBar } from '@/components/MobileTopBar';
import { FeedList } from '@/components/FeedList';

export const dynamic = 'force-dynamic'; // always read latest KV

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getFeeds().map((f) => ({ slug: f.slug }));
}

export default async function FeedPage({ params }: Props) {
  const { slug } = await params;
  const feed = getFeedBySlug(slug);
  if (!feed) notFound();

  const snapshot = await getFeedSnapshot(slug);

  return (
    <>
      <MobileTopBar activeSlug={slug} fetchedAt={snapshot?.fetchedAt ?? null} />
      <div className="layout">
        <Sidebar variant="desktop" activeSlug={slug} />
        <FeedList title={feed.title} snapshot={snapshot} />
      </div>
    </>
  );
}
