import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedItem } from '@/components/FeedItem';
import type { FeedItem as Item } from '@/lib/types';

const item: Item = {
  guid: 'https://example.com/a',
  title: 'Test Headline',
  link: 'https://example.com/a',
  description: 'A short description.',
  byline: 'Jane Doe',
  pubDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  image: 'https://example.com/thumb.jpg'
};

const READ_KEY = 'nyt-feed:read';

describe('FeedItem', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders title, byline, description, and thumbnail', () => {
    render(<FeedItem item={item} />);
    expect(screen.getByText('Test Headline')).toBeInTheDocument();
    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
    expect(screen.getByText('A short description.')).toBeInTheDocument();
    const thumb = screen.getByTestId('thumb');
    expect(thumb).toHaveStyle({
      backgroundImage: `url(${item.image})`
    });
  });

  it('opens link in a new tab', () => {
    render(<FeedItem item={item} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', item.link);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('renders without the read class when GUID is absent from localStorage', () => {
    render(<FeedItem item={item} />);
    expect(screen.getByTestId('item')).not.toHaveClass('read');
  });

  it('renders with the read class when GUID is present in localStorage', () => {
    localStorage.setItem(READ_KEY, JSON.stringify([item.guid]));
    render(<FeedItem item={item} />);
    expect(screen.getByTestId('item')).toHaveClass('read');
  });

  it('adds GUID to localStorage and applies read class on click', () => {
    render(<FeedItem item={item} />);
    const link = screen.getByRole('link');
    fireEvent.click(link);
    const stored = JSON.parse(localStorage.getItem(READ_KEY) ?? '[]');
    expect(stored).toContain(item.guid);
    expect(screen.getByTestId('item')).toHaveClass('read');
  });

  it('does not duplicate the GUID on repeated clicks', () => {
    render(<FeedItem item={item} />);
    const link = screen.getByRole('link');
    fireEvent.click(link);
    fireEvent.click(link);
    const stored = JSON.parse(localStorage.getItem(READ_KEY) ?? '[]');
    expect(stored.filter((g: string) => g === item.guid)).toHaveLength(1);
  });

  it('renders a placeholder thumbnail when image is null', () => {
    const noImage = { ...item, image: null };
    render(<FeedItem item={noImage} />);
    const thumb = screen.queryByTestId('thumb');
    expect(thumb).toBeNull();
  });

  it('renders feed badges when feeds prop is provided', () => {
    const feeds = [
      { slug: 'home', title: 'Home Page', url: 'https://x/h' },
      { slug: 'business', title: 'Business', url: 'https://x/b' },
    ];
    render(<FeedItem item={item} feeds={feeds} />);
    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.getByText('Business')).toBeInTheDocument();
  });

  it('does not render badges when feeds prop is omitted', () => {
    const { container } = render(<FeedItem item={item} />);
    expect(container.querySelector('.badges')).toBeNull();
  });

  it('does not render badges when feeds prop is an empty array', () => {
    const { container } = render(<FeedItem item={item} feeds={[]} />);
    expect(container.querySelector('.badges')).toBeNull();
  });
});
