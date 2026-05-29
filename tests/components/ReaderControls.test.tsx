import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReaderControls } from '@/components/ReaderControls';

const TYPEWRITER_KEY = 'nyt-feed:typewriter';
const THEME_KEY = 'nyt-feed:theme';

describe('ReaderControls', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-typewriter');
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders defaults: typewriter off, System selected', () => {
    render(<ReaderControls />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('enabling typewriter writes localStorage and sets the html attribute', () => {
    render(<ReaderControls />);
    fireEvent.click(screen.getByRole('switch'));
    expect(localStorage.getItem(TYPEWRITER_KEY)).toBe('on');
    expect(document.documentElement.getAttribute('data-typewriter')).toBe('on');
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('disabling typewriter writes off and removes the html attribute', () => {
    render(<ReaderControls />);
    const sw = screen.getByRole('switch');
    fireEvent.click(sw);
    fireEvent.click(sw);
    expect(localStorage.getItem(TYPEWRITER_KEY)).toBe('off');
    expect(document.documentElement.hasAttribute('data-typewriter')).toBe(false);
  });

  it('choosing Dark sets data-theme=dark and persists', () => {
    render(<ReaderControls />);
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('choosing System removes data-theme and persists "system"', () => {
    render(<ReaderControls />);
    fireEvent.click(screen.getByRole('button', { name: 'Light' }));
    fireEvent.click(screen.getByRole('button', { name: 'System' }));
    expect(localStorage.getItem(THEME_KEY)).toBe('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('initializes from existing localStorage on mount', () => {
    localStorage.setItem(TYPEWRITER_KEY, 'on');
    localStorage.setItem(THEME_KEY, 'dark');
    render(<ReaderControls />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
  });
});
