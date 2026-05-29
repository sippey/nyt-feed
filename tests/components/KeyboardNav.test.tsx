import { describe, it, expect } from 'vitest';
import { computeTypewriterScrollTop } from '@/components/KeyboardNav';

// viewport 800px tall, target line at 45% => 360px.
const VH = 800;

describe('computeTypewriterScrollTop', () => {
  it('centers a mid-list item on the ~45% target line', () => {
    // item center at document y=1000 => scrollTop = 1000 - 360 = 640
    const top = computeTypewriterScrollTop({
      itemTop: 990,
      itemHeight: 20,
      viewportHeight: VH,
      maxScroll: 5000,
    });
    expect(top).toBe(640);
  });

  it('clamps to 0 for items near the top (cannot scroll above the document)', () => {
    const top = computeTypewriterScrollTop({
      itemTop: 90,
      itemHeight: 20,
      viewportHeight: VH,
      maxScroll: 5000,
    });
    expect(top).toBe(0);
  });

  it('clamps to maxScroll for items near the bottom', () => {
    const top = computeTypewriterScrollTop({
      itemTop: 9990,
      itemHeight: 20,
      viewportHeight: VH,
      maxScroll: 5000,
    });
    expect(top).toBe(5000);
  });

  it('never returns a negative value even when maxScroll is 0', () => {
    const top = computeTypewriterScrollTop({
      itemTop: 10,
      itemHeight: 20,
      viewportHeight: VH,
      maxScroll: 0,
    });
    expect(top).toBe(0);
  });

  it('honors a custom target ratio', () => {
    const top = computeTypewriterScrollTop({
      itemTop: 990,
      itemHeight: 20,
      viewportHeight: VH,
      maxScroll: 5000,
      targetRatio: 0.5,
    });
    expect(top).toBe(600);
  });
});
