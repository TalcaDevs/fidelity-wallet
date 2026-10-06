import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PanelTitle } from './PanelTitle';

describe('PanelTitle', () => {
  it('keeps the heading accessible as complete text while its letters are decorative', () => {
    const { container } = render(<h1><PanelTitle text="Analítica y Reportes" /></h1>);
    expect(screen.getByRole('heading', { name: 'Analítica y Reportes' })).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('Analítica y Reportes');
    expect(container.querySelector('.sr-only')).toHaveTextContent('Analítica y Reportes');
  });
});
