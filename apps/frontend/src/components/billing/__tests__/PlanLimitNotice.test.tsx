import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlanLimitNotice, PlanUsageBar } from '../PlanLimitNotice';

describe('PlanLimitNotice Component', () => {
  it('no renderiza nada cuando el límite es null y showWhenUnlimited es false', () => {
    const { container } = render(
      <PlanLimitNotice current={2} limit={null} resourceName="sucursales" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra conteo ilimitado cuando limit es null y showWhenUnlimited es true', () => {
    render(
      <PlanLimitNotice
        current={5}
        limit={null}
        resourceName="clientes"
        showWhenUnlimited
      />,
    );

    expect(screen.getByText('5 clientes (Ilimitado)')).toBeInTheDocument();
  });

  it('muestra el texto estándar cuando el consumo está bajo el límite', () => {
    render(
      <PlanLimitNotice
        current={2}
        limit={5}
        resourceName="sucursales activas de tu plan"
      />,
    );

    const notice = screen.getByText(/2 de 5 sucursales activas de tu plan/);
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveClass('text-panel-muted');
    expect(screen.queryByText(/llegaste al límite/i)).not.toBeInTheDocument();
  });

  it('muestra aviso en naranja con link para subir de plan cuando se alcanza el límite', () => {
    render(
      <PlanLimitNotice
        current={3}
        limit={3}
        resourceName="sucursales activas de tu plan"
        actionVerb="agregar o activar más"
      />,
    );

    const notice = screen.getByText(/3 de 3 sucursales activas de tu plan/);
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveClass('text-orange-600');

    const link = screen.getByRole('link', { name: 'sube de plan' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/admin/billing');
    expect(screen.getByText(/para agregar o activar más/)).toBeInTheDocument();
  });

  it('permite deshabilitar el link interactivo con showUpgradeLink={false}', () => {
    render(
      <PlanLimitNotice
        current={2}
        limit={2}
        resourceName="usuarios de equipo"
        showUpgradeLink={false}
      />,
    );

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(/llegaste al límite: sube de plan para agregar más/)).toBeInTheDocument();
  });

  it('renderiza la variante banner cuando se alcanza el límite', () => {
    render(
      <PlanLimitNotice
        variant="banner"
        current={4}
        limit={4}
        resourceName="sucursales"
        actionVerb="activar más locales"
      />,
    );

    const banner = screen.getByRole('alert');
    expect(banner).toBeInTheDocument();
    expect(screen.getByText(/Llegaste al límite de sucursales \(4 de 4\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Subir de plan' })).toBeInTheDocument();
  });

  it('no muestra la variante banner cuando aún quedan recursos disponibles', () => {
    const { container } = render(
      <PlanLimitNotice
        variant="banner"
        current={1}
        limit={5}
        resourceName="sucursales"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

describe('PlanUsageBar Component', () => {
  it('renderiza la barra de consumo con valores normales', () => {
    const { container } = render(
      <PlanUsageBar label="Sucursales" used={2} limit={10} />,
    );

    expect(screen.getByText('Sucursales')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('de 10')).toBeInTheDocument();

    const bar = container.querySelector('.bg-panel-primary');
    expect(bar).toBeInTheDocument();
  });

  it('cambia el color a naranja cuando el consumo supera el 80%', () => {
    const { container } = render(
      <PlanUsageBar label="Usuarios" used={4} limit={5} />,
    );

    const bar = container.querySelector('.bg-orange-500');
    expect(bar).toBeInTheDocument();
  });

  it('soporta límite infinito (null)', () => {
    render(<PlanUsageBar label="Clientes" used={150} limit={null} />);

    expect(screen.getByText('de ∞')).toBeInTheDocument();
  });
});
