import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { Dashboard } from './Dashboard';
import * as useDashboardStatsModule from '../../hooks/useDashboardStats';

describe('Dashboard', () => {
  it('renders QR and Manual badges for recent activity scans', () => {
    vi.spyOn(useDashboardStatsModule, 'useDashboardStats').mockReturnValue({
      stats: {
        activePasses: 10,
        stampsDelivered: 50,
        rewardsRedeemed: 5,
        recentScans: [
          {
            id: 'scan-1',
            type: 'STAMP_ADDED',
            createdAt: '2026-09-25T12:00:00Z',
            method: 'QR',
            customer: { rut: '12345678-5', phone: null },
          },
          {
            id: 'scan-2',
            type: 'REWARD_REDEEMED',
            createdAt: '2026-09-25T12:05:00Z',
            method: 'MANUAL',
            customer: { rut: null, phone: '+56912345678' },
          },
        ],
      },
      loading: false,
      error: null,
      fetchStats: vi.fn(),
    });

    render(<Dashboard session={null} brandId="merchant-1" />);

    expect(screen.getByText('QR')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hoy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hace una semana' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todo el tiempo' })).toBeInTheDocument();
  });

  it('filters recent activity by date presets', () => {
    const today = new Date().toISOString();
    const twoMonthsAgo = new Date(Date.now() - 60 * 86400000).toISOString();

    vi.spyOn(useDashboardStatsModule, 'useDashboardStats').mockReturnValue({
      stats: {
        activePasses: 10,
        stampsDelivered: 50,
        rewardsRedeemed: 5,
        recentScans: [
          {
            id: 'scan-today',
            type: 'STAMP_ADDED',
            createdAt: today,
            method: 'QR',
            customer: { rut: '11111111-1', phone: null },
          },
          {
            id: 'scan-old',
            type: 'REWARD_REDEEMED',
            createdAt: twoMonthsAgo,
            method: 'MANUAL',
            customer: { rut: '22222222-2', phone: null },
          },
        ],
      },
      loading: false,
      error: null,
      fetchStats: vi.fn(),
    });

    render(<Dashboard session={null} brandId="merchant-1" />);

    // Default is "all" -> both scans visible (RUTs masked as ···111-1 and ···222-2)
    expect(screen.getAllByText('···111-1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('···222-2').length).toBeGreaterThan(0);

    // Switch to "Hoy"
    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(screen.getAllByText('···111-1').length).toBeGreaterThan(0);
    expect(screen.queryByText('···222-2')).not.toBeInTheDocument();

    // Switch to "Hace una semana" -> old scan still hidden, today is included
    fireEvent.click(screen.getByRole('button', { name: 'Hace una semana' }));
    expect(screen.getAllByText('···111-1').length).toBeGreaterThan(0);
    expect(screen.queryByText('···222-2')).not.toBeInTheDocument();

    // Switch back to "Todo el tiempo"
    fireEvent.click(screen.getByRole('button', { name: 'Todo el tiempo' }));
    expect(screen.getAllByText('···111-1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('···222-2').length).toBeGreaterThan(0);
  });

  it('paginates recent activity scans (pasar página)', () => {
    const scans = Array.from({ length: 7 }, (_, i) => ({
      id: `scan-${i + 1}`,
      type: 'STAMP_ADDED',
      createdAt: new Date(Date.now() - i * 1000).toISOString(),
      method: 'QR' as const,
      customer: { rut: `1000000${i}-1`, phone: null },
    }));

    vi.spyOn(useDashboardStatsModule, 'useDashboardStats').mockReturnValue({
      stats: {
        activePasses: 10,
        stampsDelivered: 50,
        rewardsRedeemed: 5,
        recentScans: scans,
      },
      loading: false,
      error: null,
      fetchStats: vi.fn(),
    });

    render(<Dashboard session={null} brandId="merchant-1" />);

    // Total 7 items, 5 per page -> Page 1 has scan-1 to scan-5
    expect(screen.getByText(/Página/)).toBeInTheDocument();
    expect(screen.getByText(/1 - 5/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página anterior de movimientos' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página siguiente de movimientos' })).toBeEnabled();

    // Click "Siguiente" -> Page 2 has scan-6 and scan-7
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente de movimientos' }));
    expect(screen.getByText(/6 - 7/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página siguiente de movimientos' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página anterior de movimientos' })).toBeEnabled();
  });

  it('renders onboarding checklist when store has no activity yet', () => {
    vi.spyOn(useDashboardStatsModule, 'useDashboardStats').mockReturnValue({
      stats: {
        activePasses: 0,
        stampsDelivered: 0,
        rewardsRedeemed: 0,
        recentScans: [],
      },
      loading: false,
      error: null,
      fetchStats: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Dashboard session={null} brandId="new-store-1" />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Primeros pasos/ })).toBeInTheDocument();
  });
});
