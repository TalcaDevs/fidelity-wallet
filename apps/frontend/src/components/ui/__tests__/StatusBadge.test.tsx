import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge Component', () => {
  it('renderiza el texto del badge con el tono neutral por defecto', () => {
    render(<StatusBadge>Inactivo</StatusBadge>);

    const badge = screen.getByText('Inactivo');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-panel-soft');
  });

  it('aplica las clases semánticas para el tono success', () => {
    render(<StatusBadge tone="success">Activo</StatusBadge>);

    const badge = screen.getByText('Activo');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-emerald-700');
  });

  it('aplica las clases semánticas para los tonos warning, info, orange y danger', () => {
    const { rerender } = render(<StatusBadge tone="warning">Pendiente</StatusBadge>);
    expect(screen.getByText('Pendiente')).toHaveClass('text-amber-700');

    rerender(<StatusBadge tone="info">Frecuente</StatusBadge>);
    expect(screen.getByText('Frecuente')).toHaveClass('text-panel-accent');

    rerender(<StatusBadge tone="orange">Premio</StatusBadge>);
    expect(screen.getByText('Premio')).toHaveClass('text-panel-orange');

    rerender(<StatusBadge tone="danger">Baja</StatusBadge>);
    expect(screen.getByText('Baja')).toHaveClass('text-rose-700');
  });

  it('soporta tamaños sm, md y lg', () => {
    const { rerender } = render(<StatusBadge size="sm">Pequeño</StatusBadge>);
    expect(screen.getByText('Pequeño')).toHaveClass('text-[11px]');

    rerender(<StatusBadge size="md">Mediano</StatusBadge>);
    expect(screen.getByText('Mediano')).toHaveClass('text-xs');

    rerender(<StatusBadge size="lg">Grande</StatusBadge>);
    expect(screen.getByText('Grande')).toHaveClass('text-xs sm:text-sm');
  });

  it('renderiza el punto indicador cuando dot es true', () => {
    const { container } = render(
      <StatusBadge tone="success" dot>
        En línea
      </StatusBadge>,
    );

    const dot = container.querySelector('.bg-emerald-500');
    expect(dot).toBeInTheDocument();
    expect(screen.getByText('En línea')).toBeInTheDocument();
  });
});
