import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from '../PageHeader';

describe('PageHeader Component (Layout Layer)', () => {
  it('renderiza el título con accesibilidad de h1 y animación de PanelTitle por defecto', () => {
    render(<PageHeader title="Sucursales" />);

    const heading = screen.getByRole('heading', { level: 1, name: 'Sucursales' });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('text-panel-text');
  });

  it('permite deshabilitar la animación de revelación con animated={false}', () => {
    render(<PageHeader title="Título estático" animated={false} />);

    const heading = screen.getByRole('heading', { level: 1, name: 'Título estático' });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBe('Título estático');
  });

  it('renderiza la descripción o subtítulo cuando se provee', () => {
    render(
      <PageHeader
        title="Clientes"
        description="Tu base de datos: quién vuelve y cuántos sellos lleva."
      />,
    );

    expect(screen.getByText('Tu base de datos: quién vuelve y cuántos sellos lleva.')).toBeInTheDocument();
  });

  it('renderiza botones y controles dentro del slot de actions', () => {
    render(
      <PageHeader
        title="Sucursales"
        actions={<button type="button">Agregar sucursal</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Agregar sucursal' })).toBeInTheDocument();
  });

  it('renderiza children adicionales dentro del contenedor de cabecera', () => {
    render(
      <PageHeader title="Reportes">
        <span data-testid="extra-child">Filtro adicional</span>
      </PageHeader>,
    );

    expect(screen.getByTestId('extra-child')).toBeInTheDocument();
  });

  it('asigna el ref al elemento h1 cuando se proporciona headingRef', () => {
    const headingRef = createRef<HTMLHeadingElement>();
    render(<PageHeader title="Mi Cuenta" headingRef={headingRef} />);

    expect(headingRef.current).toBeInstanceOf(HTMLHeadingElement);
    expect(headingRef.current?.tagName).toBe('H1');
  });

  it('combina clases CSS personalizadas en el contenedor header', () => {
    const { container } = render(
      <PageHeader title="Ajustes" className="custom-class mb-12" />,
    );

    const header = container.querySelector('header');
    expect(header).toHaveClass('custom-class');
    expect(header).toHaveClass('mb-12');
  });
});
