'use client';

import { useEffect, useState } from 'react';
import { computeTypewriterScrollTop } from '@/components/KeyboardNav';

type Theme = 'system' | 'light' | 'dark';

const TYPEWRITER_KEY = 'nyt-feed:typewriter';
const THEME_KEY = 'nyt-feed:theme';

function readTypewriter(): boolean {
  try {
    return localStorage.getItem(TYPEWRITER_KEY) === 'on';
  } catch {
    return false;
  }
}

function readTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function recenterSelected() {
  const el = document.querySelector<HTMLElement>('.item.selected');
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const top = computeTypewriterScrollTop({
    itemTop: rect.top + window.scrollY,
    itemHeight: rect.height,
    viewportHeight: window.innerHeight,
    maxScroll: document.documentElement.scrollHeight - window.innerHeight,
  });
  window.scrollTo({ top, behavior: 'auto' });
}

const THEMES: Theme[] = ['system', 'light', 'dark'];
const THEME_LABEL: Record<Theme, string> = { system: 'System', light: 'Light', dark: 'Dark' };

export function ReaderControls() {
  const [typewriter, setTypewriter] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');

  // Server render uses defaults; reconcile from localStorage after mount.
  useEffect(() => {
    setTypewriter(readTypewriter());
    setTheme(readTheme());
  }, []);

  function applyTypewriter(on: boolean) {
    setTypewriter(on);
    try {
      localStorage.setItem(TYPEWRITER_KEY, on ? 'on' : 'off');
    } catch {}
    const root = document.documentElement;
    if (on) {
      root.setAttribute('data-typewriter', 'on');
      recenterSelected();
    } else {
      root.removeAttribute('data-typewriter');
    }
  }

  function applyTheme(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    const root = document.documentElement;
    if (next === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', next);
  }

  return (
    <div className="reader-controls">
      <button
        type="button"
        className="rc-switch"
        role="switch"
        aria-checked={typewriter}
        onClick={() => applyTypewriter(!typewriter)}
      >
        <span className="rc-switch-label">Focus mode</span>
        <span className="rc-track" aria-hidden="true">
          <span className="rc-knob" />
        </span>
      </button>

      <div className="rc-theme" role="group" aria-label="Theme">
        {THEMES.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={theme === t}
            onClick={() => applyTheme(t)}
          >
            {THEME_LABEL[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
