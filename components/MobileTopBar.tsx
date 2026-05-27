'use client';

import { useState } from 'react';
import { MobileDrawer } from './MobileDrawer';
import { relativeTime } from '@/lib/time';

type Props = {
  fetchedAt: string | null;
};

export function MobileTopBar({ fetchedAt }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mobile-topbar">
        <button
          className="hamburger"
          aria-label="Open navigation menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          ☰
        </button>
        <div className="brand">NYT</div>
        {fetchedAt && <div className="updated">Updated {relativeTime(fetchedAt)}</div>}
      </div>
      <MobileDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
