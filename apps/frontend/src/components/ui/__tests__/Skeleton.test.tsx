import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonCard, SkeletonList, SkeletonTable } from '../Skeleton';

describe('Skeleton UI component', () => {
  it('renders base skeleton with pulse class and aria-hidden', () => {
    render(<Skeleton className="h-6 w-24" />);
    const el = screen.getByTestId('skeleton');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('motion-safe:animate-pulse');
    expect(el).toHaveClass('h-6');
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders skeleton card with default lines', () => {
    render(<SkeletonCard />);
    const card = screen.getByTestId('skeleton-card');
    expect(card).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(4);
  });

  it('renders skeleton list with custom count', () => {
    render(<SkeletonList count={4} />);
    const list = screen.getByTestId('skeleton-list');
    expect(list).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton-card')).toHaveLength(4);
  });

  it('renders skeleton table with rows and columns', () => {
    render(<SkeletonTable rows={3} cols={5} />);
    const table = screen.getByTestId('skeleton-table');
    expect(table).toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton')).toHaveLength(15);
  });

  it('supports attached helper properties on Skeleton', () => {
    expect(Skeleton.Card).toBe(SkeletonCard);
    expect(Skeleton.List).toBe(SkeletonList);
    expect(Skeleton.Table).toBe(SkeletonTable);
  });
});
