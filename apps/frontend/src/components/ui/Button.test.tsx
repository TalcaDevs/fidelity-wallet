import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button Component', () => {
  it('renders children with default primary variant, md size, and button type', () => {
    render(<Button>Guardar</Button>);

    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('bg-panel-primary');
    expect(button).toHaveClass('px-4 py-2.5');
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<Button variant="secondary">Cancelar</Button>);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveClass('bg-panel-soft');

    rerender(<Button variant="outline">Detalle</Button>);
    expect(screen.getByRole('button', { name: 'Detalle' })).toHaveClass('border-panel-border');

    rerender(<Button variant="ghost">Ver más</Button>);
    expect(screen.getByRole('button', { name: 'Ver más' })).toHaveClass('bg-transparent');

    rerender(<Button variant="danger">Eliminar</Button>);
    expect(screen.getByRole('button', { name: 'Eliminar' })).toHaveClass('bg-red-600');

    rerender(<Button variant="danger-soft">Quitar</Button>);
    expect(screen.getByRole('button', { name: 'Quitar' })).toHaveClass('bg-red-500/10');
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<Button size="sm">Pequeño</Button>);
    expect(screen.getByRole('button', { name: 'Pequeño' })).toHaveClass('px-3 py-1.5 text-xs');

    rerender(<Button size="md">Mediano</Button>);
    expect(screen.getByRole('button', { name: 'Mediano' })).toHaveClass('px-4 py-2.5 text-sm');

    rerender(<Button size="lg">Grande</Button>);
    expect(screen.getByRole('button', { name: 'Grande' })).toHaveClass('px-6 py-3 text-base');
  });

  it('supports fullWidth prop', () => {
    render(<Button fullWidth>Ancho completo</Button>);
    expect(screen.getByRole('button', { name: 'Ancho completo' })).toHaveClass('w-full');
  });

  it('renders left and right icons', () => {
    render(
      <Button
        leftIcon={<span data-testid="left-icon">←</span>}
        rightIcon={<span data-testid="right-icon">→</span>}
      >
        Continuar
      </Button>,
    );

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByText('Continuar')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('handles loading state with spinner and disabled state', () => {
    render(
      <Button isLoading loadingText="Guardando...">
        Guardar cambios
      </Button>,
    );

    const button = screen.getByRole('button', { name: /Guardando\.\.\./i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Guardando...')).toBeInTheDocument();
  });

  it('shows spinner and original children if loadingText is not provided', () => {
    render(<Button isLoading>Enviar</Button>);

    const button = screen.getByRole('button', { name: /Enviar/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('invokes onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Acción</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Acción' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onClick handler when disabled or loading', () => {
    const handleClick = vi.fn();
    const { rerender } = render(
      <Button disabled onClick={handleClick}>
        Deshabilitado
      </Button>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Deshabilitado' }));
    expect(handleClick).not.toHaveBeenCalled();

    rerender(
      <Button isLoading onClick={handleClick}>
        Cargando
      </Button>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Cargando/i }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('forwards ref to the underlying button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Con ref</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe('Con ref');
  });

  it('allows custom type attribute such as submit', () => {
    render(<Button type="submit">Enviar formulario</Button>);
    expect(screen.getByRole('button', { name: 'Enviar formulario' })).toHaveAttribute(
      'type',
      'submit',
    );
  });
});
