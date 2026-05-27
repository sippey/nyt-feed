import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const homeXml = readFileSync(path.join(__dirname, '../fixtures/home.xml'), 'utf-8');

vi.mock('@/lib/kv', () => ({
  getFeedSnapshot: vi.fn(),
  setFeedSnapshot: vi.fn().mockResolvedValue(undefined)
}));

import { POST } from '@/app/api/refresh/route';
import * as kvModule from '@/lib/kv';

const setSnapshot = vi.mocked(kvModule.setFeedSnapshot);

function makeRequest(authHeader?: string) {
  const headers = new Headers();
  if (authHeader) headers.set('authorization', authHeader);
  return new Request('http://localhost/api/refresh', { method: 'POST', headers });
}

describe('POST /api/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => homeXml
    } as Response)));
  });

  it('rejects unauthorized requests', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it('rejects requests with the wrong bearer token', async () => {
    const res = await POST(makeRequest('Bearer wrong'));
    expect(res.status).toBe(401);
  });

  it('writes one KV entry per feed on success', async () => {
    const res = await POST(makeRequest('Bearer test-secret'));
    expect(res.status).toBe(200);
    // 6 feeds in config/feeds.json
    expect(setSnapshot).toHaveBeenCalledTimes(6);
    // Each call gets a slug + a snapshot containing items + fetchedAt
    for (const call of setSnapshot.mock.calls) {
      expect(typeof call[0]).toBe('string');
      expect(Array.isArray(call[1].items)).toBe(true);
      expect(typeof call[1].fetchedAt).toBe('string');
    }
  });

  it('does NOT write KV for a failed feed and still writes others', async () => {
    // Make the 1st feed fail, the rest succeed.
    let callIndex = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      const i = callIndex++;
      if (i === 0) {
        return { ok: false, status: 502, text: async () => '' } as Response;
      }
      return { ok: true, status: 200, text: async () => homeXml } as Response;
    }));

    const res = await POST(makeRequest('Bearer test-secret'));
    expect(res.status).toBe(200);
    expect(setSnapshot).toHaveBeenCalledTimes(5);
    const body = await res.json();
    const errored = body.results.filter((r: { status: string }) => r.status === 'error');
    expect(errored).toHaveLength(1);
  });

  it('sends a polite User-Agent header on RSS fetches', async () => {
    await POST(makeRequest('Bearer test-secret'));
    const fetchMock = vi.mocked(fetch);
    const firstCall = fetchMock.mock.calls[0];
    const init = firstCall[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('user-agent')).toMatch(/nyt-feed/);
  });

  it('also accepts GET (used by Vercel Cron)', async () => {
    const { GET } = await import('@/app/api/refresh/route');
    const headers = new Headers({ authorization: 'Bearer test-secret' });
    const req = new Request('http://localhost/api/refresh', { method: 'GET', headers });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
