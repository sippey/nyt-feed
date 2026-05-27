import { redirect } from 'next/navigation';
import { getFeeds } from '@/lib/feeds';

export default function Root() {
  const first = getFeeds()[0];
  redirect(`/${first.slug}`);
}
