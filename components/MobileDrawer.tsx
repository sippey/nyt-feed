'use client';

import { useEffect } from 'react';
import { Sidebar } from './Sidebar';

type Props = {
  open: boolean;
  activeSlug: string;
  onClose: () => void;
};

export function MobileDrawer({ open, activeSlug, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer-root">
      <div className="drawer-scrim" onClick={onClose} aria-hidden="true" />
      <Sidebar variant="drawer" activeSlug={activeSlug} onNavigate={onClose} />
    </div>
  );
}
