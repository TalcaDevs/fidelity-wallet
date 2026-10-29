import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders title and subtitle with default variant', () => {
    render(
      <EmptyState
        title="No hay clientes registrados"
        subtitle="Aparecerán aquí cuando se registren"
      />
    );
    expect(screen.getByText('No hay clientes registrados')).toBeInTheDocument();
    expect(screen.getByText('Aparecerán aquí cuando se registren')).toBeInTheDocument();
  });

  it('renders simple variant with minimal text', () => {
    render(<EmptyState variant="simple" title="No hay promociones configuradas." />);
    expect(screen.getByText('No hay promociones configuradas.')).toBeInTheDocument();
  });

  it('renders dashed variant with icon and action button', () => {
    render(
      <EmptyState
        variant="dashed"
        icon={<span data-testid="custom-icon">Icon</span>}
        title="Sin actividad"
        description="Prueba con otro filtro"
        action={<button type="button">Limpiar</button>}
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(screen.getByText('Sin actividad')).toBeInTheDocument();
    expect(screen.getByText('Prueba con otro filtro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpiar' })).toBeInTheDocument();
  });

  it('renders card variant with custom classes', () => {
    render(
      <EmptyState
        variant="card"
        title="Sin sucursales"
        titleClassName="text-xl font-extrabold text-blue-600"
      />
    );
    const title = screen.getByText('Sin sucursales');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-xl');
  });
});
