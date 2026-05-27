import '@testing-library/jest-dom/vitest';

// Node 26 exposes a built-in `localStorage` that evaluates to `undefined` when no
// --localstorage-file flag is set. Vitest's jsdom environment does NOT include
// `localStorage` in its global-copy allowlist, so Node 26's undefined value wins.
// We explicitly map jsdom's Storage instance onto `globalThis` so tests can use it.
const _g = globalThis as unknown as { jsdom?: { window: Window } };
if (typeof _g.jsdom !== 'undefined') {
  const jsdomWindow = _g.jsdom!.window;
  if (jsdomWindow.localStorage) {
    Object.defineProperty(globalThis, 'localStorage', {
      value: jsdomWindow.localStorage,
      configurable: true,
      writable: true,
    });
  }
  if (jsdomWindow.sessionStorage) {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: jsdomWindow.sessionStorage,
      configurable: true,
      writable: true,
    });
  }
}
