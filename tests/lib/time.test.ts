import { describe, it, expect } from 'vitest';
import { relativeTime } from '@/lib/time';

const now = new Date('2026-05-26T12:00:00Z');

describe('relativeTime', () => {
  it('returns "just now" for < 1 min', () => {
    const t = new Date('2026-05-26T11:59:30Z').toISOString();
    expect(relativeTime(t, now)).toBe('just now');
  });

  it('returns minutes for < 1 hour', () => {
    const t = new Date('2026-05-26T11:43:00Z').toISOString();
    expect(relativeTime(t, now)).toBe('17m ago');
  });

  it('returns hours for < 24 hours', () => {
    const t = new Date('2026-05-26T08:00:00Z').toISOString();
    expect(relativeTime(t, now)).toBe('4h ago');
  });

  it('returns "yesterday" for 24-48 hours', () => {
    const t = new Date('2026-05-25T08:00:00Z').toISOString();
    expect(relativeTime(t, now)).toBe('yesterday');
  });

  it('returns a short date for older items', () => {
    const t = new Date('2026-05-22T12:00:00Z').toISOString();
    expect(relativeTime(t, now)).toBe('May 22');
  });

  it('returns "unknown" for invalid input', () => {
    expect(relativeTime('not-a-date', now)).toBe('unknown');
  });
});
