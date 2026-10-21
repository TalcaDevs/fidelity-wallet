import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubscriptionMock } from '@fidelity/shared';
import { Billing } from './Billing';

const mockUseSubscription = vi.fn();

vi.mock('../../hooks/useSubscription', () => ({
  useSubscription: (...args: unknown[]) => mockUseSubscription(...args),
}));

const baseSubscription: SubscriptionMock = {
  planId: 'TRIAL',
  status: 'TRIALING',
  billingCycle: 'MONTHLY',
  trialEndsAt: '2026-11-01T00:00:00.000Z',
  currentPeriodEnd: '2026-11-01T00:00:00.000Z',
  usage: {
    programs: 1,
    locations: 1,
    teamUsers: 2,
    customers: 15,
  },
};

describe('Billing component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders normal active state without suspension alert', () => {
    mockUseSubscription.mockReturnValue({
      subscription: baseSubscription,
      trialDaysLeft: 18,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <Billing brandId="brand-1" isSuspended={false} />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Prueba gratis')[0]).toBeInTheDocument();
    expect(screen.getByText('En prueba')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/cuenta se encuentra suspendida/i)).not.toBeInTheDocument();
    expect(screen.getByText(/quedan 18 días de prueba/i)).toBeInTheDocument();
  });

  it('renders neutral suspension banner when suspended without overdue debt', () => {
    mockUseSubscription.mockReturnValue({
      subscription: { ...baseSubscription, status: 'TRIALING' },
      trialDaysLeft: 18,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <Billing brandId="brand-1" isSuspended={true} />
      </MemoryRouter>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tu cuenta se encuentra suspendida' })).toBeInTheDocument();
    expect(screen.getByText('Cuenta suspendida')).toBeInTheDocument();
    expect(
      screen.getByText('Escríbenos a soporte para conocer el estado de tu cuenta y reactivar tu servicio.'),
    ).toBeInTheDocument();

    expect(screen.queryByText(/por mora/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pagos pendientes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/regularizar tu situación/i)).not.toBeInTheDocument();
  });

  it('renders neutral suspension banner and separates trial expiration when PAST_DUE with administrative suspension', () => {
    mockUseSubscription.mockReturnValue({
      subscription: { ...baseSubscription, status: 'PAST_DUE' },
      trialDaysLeft: 0,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <Billing brandId="brand-1" isSuspended={true} />
      </MemoryRouter>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tu cuenta se encuentra suspendida' })).toBeInTheDocument();
    expect(screen.getByText('Cuenta suspendida')).toBeInTheDocument();
    expect(screen.getByText(/Prueba vencida el/i)).toBeInTheDocument();
    expect(screen.getByText(/Servicio pausado por suspensión/i)).toBeInTheDocument();
    expect(
      screen.getByText('Escríbenos a soporte para conocer el estado de tu cuenta y reactivar tu servicio.'),
    ).toBeInTheDocument();

    expect(screen.queryByText(/por mora/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pagos pendientes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/regularizar tu situación/i)).not.toBeInTheDocument();
  });

  it('renders mora suspension banner when explicit suspensionReason is mora', () => {
    mockUseSubscription.mockReturnValue({
      subscription: { ...baseSubscription, status: 'ACTIVE' },
      trialDaysLeft: 0,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <Billing brandId="brand-1" isSuspended={true} suspensionReason="mora" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Tu cuenta se encuentra suspendida por mora' })).toBeInTheDocument();
    expect(screen.getByText('Suspendido por mora')).toBeInTheDocument();
    expect(screen.getByText(/pausado temporalmente debido a pagos pendientes/i)).toBeInTheDocument();
    expect(
      screen.getByText(/escríbenos para regularizar tu situación y reactivar tu servicio/i),
    ).toBeInTheDocument();
  });
});
