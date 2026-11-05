import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ArrowIcon } from '../ArrowIcon';

describe('ArrowIcon Component', () => {
  it('renders default right-facing arrow with aria-hidden', () => {
    const { container } = render(<ArrowIcon data-testid="arrow" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('w-4', 'h-4');
    expect(svg).not.toHaveClass('rotate-180');
  });

  it('renders left-facing arrow with rotate-180', () => {
    const { container } = render(<ArrowIcon direction="left" data-testid="arrow" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('rotate-180');
  });

  it('renders up-facing arrow with -rotate-90', () => {
    const { container } = render(<ArrowIcon direction="up" data-testid="arrow" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('-rotate-90');
  });

  it('renders down-facing arrow with rotate-90', () => {
    const { container } = render(<ArrowIcon direction="down" data-testid="arrow" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('rotate-90');
  });

  it('merges custom className', () => {
    const { container } = render(<ArrowIcon className="w-5 h-5 text-brand-blue" data-testid="arrow" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-5', 'h-5', 'text-brand-blue');
  });
});
