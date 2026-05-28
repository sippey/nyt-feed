'use client';

import { useEffect, useRef, useState } from 'react';

const PAGE_SCROLL_FACTOR = 0.9;
const TOP_THRESHOLD = 64;
const GG_TIMEOUT_MS = 500;

function getItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.item'));
}

function getSections(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.feed-section, .day-section'));
}

export function KeyboardNav() {
  const selectedRef = useRef<number>(0);
  const lastGRef = useRef<number>(0);
  const [helpOpen, setHelpOpen] = useState(false);

  function applySelected(index: number, opts: { scroll?: boolean } = {}) {
    const { scroll = true } = opts;
    const items = getItems();
    if (items.length === 0) return;
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    items.forEach((el, i) => el.classList.toggle('selected', i === clamped));
    selectedRef.current = clamped;
    if (scroll) {
      const el = items[clamped];
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (rect.top < TOP_THRESHOLD || rect.bottom > vh - 16) {
        el.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      }
    }
  }

  function selectFirstVisible() {
    const items = getItems();
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (rect.bottom > TOP_THRESHOLD) {
        applySelected(i, { scroll: false });
        return;
      }
    }
  }

  // Initial selection on mount.
  useEffect(() => {
    applySelected(0, { scroll: false });
  }, []);

  // Sync selection to mouse clicks so the keyboard cursor matches the last interacted item.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const item = target?.closest<HTMLElement>('.item');
      if (!item) return;
      const items = getItems();
      const i = items.indexOf(item);
      if (i >= 0) applySelected(i, { scroll: false });
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // Keyboard handler. Rebinds when helpOpen flips so the handler can read the latest state.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      // ? toggles help (Shift+/ on US layouts produces "?")
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setHelpOpen((o) => !o);
        return;
      }

      // Esc closes help (if open). Other Esc behavior (drawer close) lives elsewhere.
      if (e.key === 'Escape' && helpOpen) {
        e.preventDefault();
        setHelpOpen(false);
        return;
      }

      // When help is open, swallow everything else so the page doesn't move behind it.
      if (helpOpen) return;

      const idx = selectedRef.current;

      // Numbered section jumps come before single-letter shortcuts.
      if (e.key >= '1' && e.key <= '9') {
        const sectionIdx = parseInt(e.key, 10) - 1;
        const sections = getSections();
        const section = sections[sectionIdx];
        if (section) {
          e.preventDefault();
          section.scrollIntoView({ behavior: 'auto', block: 'start' });
          const firstItem = section.querySelector<HTMLElement>('.item');
          if (firstItem) {
            const i = getItems().indexOf(firstItem);
            if (i >= 0) applySelected(i, { scroll: false });
          }
        }
        return;
      }

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          applySelected(idx + 1);
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          applySelected(idx - 1);
          break;
        case 'o':
        case 'Enter': {
          e.preventDefault();
          const el = getItems()[idx];
          const link = el?.querySelector<HTMLAnchorElement>('a.title');
          link?.click();
          break;
        }
        case ' ': {
          e.preventDefault();
          const direction = e.shiftKey ? -1 : 1;
          window.scrollBy({ top: window.innerHeight * PAGE_SCROLL_FACTOR * direction, behavior: 'smooth' });
          // Wait for the smooth scroll to settle before recomputing which item is at the top —
          // rAF fires mid-animation and would snap selection to the pre-scroll viewport.
          window.addEventListener('scrollend', selectFirstVisible, { once: true });
          break;
        }
        case 'G': {
          // Shift+G — go to bottom
          e.preventDefault();
          const items = getItems();
          if (items.length > 0) applySelected(items.length - 1);
          break;
        }
        case 'g': {
          // gg — go to top (two presses within GG_TIMEOUT_MS)
          const now = Date.now();
          if (now - lastGRef.current < GG_TIMEOUT_MS) {
            e.preventDefault();
            applySelected(0);
            window.scrollTo({ top: 0, behavior: 'auto' });
            lastGRef.current = 0;
          } else {
            lastGRef.current = now;
          }
          break;
        }
        case 'l': {
          e.preventDefault();
          if (window.location.pathname !== '/latest') {
            window.location.href = '/latest';
          }
          break;
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [helpOpen]);

  return helpOpen ? <KeyboardHelp onClose={() => setHelpOpen(false)} /> : null;
}

function KeyboardHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="kbd-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="kbd-panel" onClick={(e) => e.stopPropagation()}>
        <div className="kbd-title">Keyboard shortcuts</div>
        <div className="kbd-list">
          <div className="kbd-row"><span className="kbd-keys"><kbd>j</kbd> <kbd>↓</kbd></span><span>Next story</span></div>
          <div className="kbd-row"><span className="kbd-keys"><kbd>k</kbd> <kbd>↑</kbd></span><span>Previous story</span></div>
          <div className="kbd-row"><span className="kbd-keys"><kbd>o</kbd> <kbd>↵</kbd></span><span>Open in new tab</span></div>
          <div className="kbd-row"><span className="kbd-keys"><kbd>Space</kbd></span><span>Page down (snap to first visible)</span></div>
          <div className="kbd-row"><span className="kbd-keys"><kbd>⇧</kbd><kbd>Space</kbd></span><span>Page up (snap to first visible)</span></div>
          <div className="kbd-row"><span className="kbd-keys"><kbd>1</kbd>–<kbd>7</kbd></span><span>Jump to section</span></div>
          <div className="kbd-row"><span className="kbd-keys"><kbd>l</kbd></span><span>Go to Latest</span></div>
          <div className="kbd-row"><span className="kbd-keys"><kbd>g</kbd><kbd>g</kbd></span><span>Top of page</span></div>
          <div className="kbd-row"><span className="kbd-keys"><kbd>⇧</kbd><kbd>G</kbd></span><span>Bottom of page</span></div>
          <div className="kbd-row"><span className="kbd-keys"><kbd>?</kbd></span><span>Toggle this help</span></div>
          <div className="kbd-row"><span className="kbd-keys"><kbd>Esc</kbd></span><span>Close this help</span></div>
        </div>
      </div>
    </div>
  );
}
