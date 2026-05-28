'use client';

import { useLayoutEffect, useState } from 'react';
import type { FeedItem as Item } from '@/lib/types';
import { relativeTime } from '@/lib/time';

const READ_KEY = 'nyt-feed:read';

function loadReadSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function persistRead(guids: Set<string>) {
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify([...guids]));
  } catch {
    // ignore quota errors — read state is best-effort
  }
}

export function FeedItem({ item }: { item: Item }) {
  const [read, setRead] = useState(false);

  useLayoutEffect(() => {
    const set = loadReadSet();
    if (set.has(item.guid)) setRead(true);
  }, [item.guid]);

  const markRead = () => {
    if (read) return;
    const set = loadReadSet();
    set.add(item.guid);
    persistRead(set);
    setRead(true);
  };

  return (
    <article className={`item ${read ? 'read' : ''}`} data-testid="item">
      <div className="row">
        <div className="col">
          <a
            className="title"
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={markRead}
          >
            {item.title}
          </a>
          <div className="meta">
            {item.byline ? `${item.byline} · ` : ''}
            {relativeTime(item.pubDate)}
          </div>
          {item.description && <div className="desc">{item.description}</div>}
        </div>
        {item.image && (
          <div
            className="thumb"
            data-testid="thumb"
            style={{ backgroundImage: `url(${item.image})` }}
            aria-hidden="true"
          />
        )}
      </div>
    </article>
  );
}
