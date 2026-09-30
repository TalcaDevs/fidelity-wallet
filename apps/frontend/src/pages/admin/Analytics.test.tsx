import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Analytics } from './Analytics';
import * as reportsService from '../../services/reportsService';

describe('Analytics Page', () => {
  const merchantId = 'merchant-test-uuid';

  const mockOverview = {
    period: { from: '2026-09-01', to: '2026-09-30', timeZone: 'America/Santiago' },
    kpis: {
      newCustomers: { current: 24, previous: 20, changePercentage: 20 },
      activeCustomers: { current: 55, previous: 50, changePercentage: 10 },
      stampsDelivered: { current: 140, previous: 120, changePercentage: 16.7 },
      rewardsRedeemed: { current: 18, previous: 15, changePercentage: 20 },
      recurrenceRate: { current: 62.5, previous: 60, changePercentage: 4.2 },
      expiredStamps: { current: 4, previous: 5, changePercentage: -20 },
    },
    timeSeries: [
      { date: '2026-09-01', stamps: 5, rewards: 1, uniqueCustomers: 4 },
      { date: '2026-09-02', stamps: 8, rewards: 2, uniqueCustomers: 7 },
    ],
    methodDistribution: {
      qrCount: 120,
      manualCount: 20,
      qrPercentage: 85.7,
      manualPercentage: 14.3,
    },
  };

  const mockRetention = {
    weeklyRetention: [
      { weekStart: '2026-09-01', newCustomers: 10, returningCustomers: 25 },
    ],
    visitFrequencyDistribution: [
      { range: '1 visita', customerCount: 20, percentage: 36.4 },
      { range: '2-3 visitas', customerCount: 25, percentage: 45.5 },
      { range: '4+ visitas', customerCount: 10, percentage: 18.2 },
    ],
    dormantCustomers: {
      count: 2,
      customers: [
        {
          customerId: 'cust-1',
          maskedIdentifier: '12.***.*78-5',
          lastVisitAt: '2026-08-01T14:00:00Z',
          daysInactive: 42,
        },
      ],
    },
    cohorts: [
      {
        cohortMonth: '2026-06',
        totalNewCustomers: 30,
        month1ReturnRate: 50,
        month2ReturnRate: 35,
        month3ReturnRate: 20,
      },
    ],
  };

  const mockPromotions = {
    promotions: [
      {
        id: 'promo-1',
        name: 'Café Gratis',
        targetStamps: 5,
        rewardName: 'Café Americano',
        isActive: true,
        redeemedCount: 15,
        averageDaysToRedeem: 12.5,
        breakageCount: 3,
      },
    ],
  };

  const mockStaff = {
    staff: [
      {
        userId: 'staff-uuid-1',
        staffName: 'Carlos Equipo',
        role: 'STAFF',
        stampsCount: 45,
        redeemsCount: 8,
        manualPercentage: 12,
        alerts: [
          {
            type: 'EXCESSIVE_STAMPS_SAME_CUSTOMER',
            severity: 'high' as const,
            description: '4 o más sellos otorgados al mismo cliente en menos de 7 días.',
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(reportsService, 'fetchOverviewReport').mockResolvedValue(mockOverview as any);
    vi.spyOn(reportsService, 'fetchRetentionReport').mockResolvedValue(mockRetention as any);
    vi.spyOn(reportsService, 'fetchPromotionsReport').mockResolvedValue(mockPromotions as any);
    vi.spyOn(reportsService, 'fetchStaffActivityReport').mockResolvedValue(mockStaff as any);
  });

  it('renders overview KPIs and chart correctly', async () => {
    render(<Analytics merchantId={merchantId} />);

    await waitFor(() => {
      expect(screen.getByText('Clientes Nuevos')).toBeInTheDocument();
    });

    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getAllByText('+20%').length).toBe(2);
    expect(screen.getByText('Premios Canjeados')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText(/85\.7%/)).toBeInTheDocument();
    expect(screen.getByText('Cantidad')).toBeInTheDocument();
    expect(screen.getByText('Días')).toBeInTheDocument();
    expect(screen.getByText('Sellos (Azul)')).toBeInTheDocument();
    expect(screen.getByText('Canjes (Naranja)')).toBeInTheDocument();
  });

  it('switches to retention tab and displays dormant customers', async () => {
    render(<Analytics merchantId={merchantId} />);

    await waitFor(() => {
      expect(screen.getByText('Clientes Nuevos')).toBeInTheDocument();
    });

    const retentionTabBtn = screen.getByText('Retención y Clientes Dormidos');
    fireEvent.click(retentionTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Frecuencia de Visitas')).toBeInTheDocument();
      expect(screen.getByText('Clientes Dormidos')).toBeInTheDocument();
      expect(screen.getByText('12.***.*78-5')).toBeInTheDocument();
      expect(screen.getByText('42 días')).toBeInTheDocument();
    });
  });

  it('switches to promotions tab and displays promotions breakdown', async () => {
    render(<Analytics merchantId={merchantId} />);

    await waitFor(() => {
      expect(screen.getByText('Clientes Nuevos')).toBeInTheDocument();
    });

    const promotionsTabBtn = screen.getByText('Rendimiento de Promociones');
    fireEvent.click(promotionsTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Rendimiento por Promoción')).toBeInTheDocument();
      expect(screen.getByText('Café Gratis')).toBeInTheDocument();
      expect(screen.getByText('12.5 días')).toBeInTheDocument();
      expect(screen.getByText('Activa')).toBeInTheDocument();
    });
  });

  it('switches to staff tab and displays staff members and antifraud alerts', async () => {
    render(<Analytics merchantId={merchantId} />);

    await waitFor(() => {
      expect(screen.getByText('Clientes Nuevos')).toBeInTheDocument();
    });

    const staffTabBtn = screen.getByText('Actividad de Equipo');
    fireEvent.click(staffTabBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Actividad de Equipo').length).toBe(2);
      expect(screen.getByText('Carlos Equipo')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText(/4 o más sellos otorgados al mismo cliente/)).toBeInTheDocument();
      expect(screen.getByText(/Severidad high/i)).toBeInTheDocument();
    });
  });

  it('displays error banner if fetching reports fails', async () => {
    vi.spyOn(reportsService, 'fetchOverviewReport').mockRejectedValue(
      new Error('No autorizado para ver reportes'),
    );

    render(<Analytics merchantId={merchantId} />);

    await waitFor(() => {
      expect(screen.getByText('No autorizado para ver reportes')).toBeInTheDocument();
    });
  });

  it('renders skeleton loading state while fetching data and hides it once loaded', async () => {
    let resolveOverview: (value: any) => void;
    const overviewPromise = new Promise((resolve) => {
      resolveOverview = resolve;
    });

    vi.spyOn(reportsService, 'fetchOverviewReport').mockReturnValue(overviewPromise as any);

    render(<Analytics merchantId={merchantId} />);

    // Skeleton should be visible immediately while promise is pending
    expect(screen.getByTestId('analytics-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-skeleton-overview')).toBeInTheDocument();
    expect(screen.queryByText('Clientes Nuevos')).not.toBeInTheDocument();

    // Now resolve the promise
    resolveOverview!(mockOverview);

    // After resolution, skeleton disappears and real content is shown
    await waitFor(() => {
      expect(screen.getByText('Clientes Nuevos')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('analytics-skeleton')).not.toBeInTheDocument();
  });

  it('renders tab-specific skeleton when switching tabs during loading', async () => {
    let resolveRetention: (value: any) => void;
    const retentionPromise = new Promise((resolve) => {
      resolveRetention = resolve;
    });

    vi.spyOn(reportsService, 'fetchRetentionReport').mockReturnValue(retentionPromise as any);

    render(<Analytics merchantId={merchantId} />);

    // Switch to retention tab while loading
    const retentionTabBtn = screen.getByText('Retención y Clientes Dormidos');
    await act(async () => {
      fireEvent.click(retentionTabBtn);
    });

    // Should display retention skeleton
    expect(screen.getByTestId('analytics-skeleton-retention')).toBeInTheDocument();

    // Switch to promotions tab while loading
    const promotionsTabBtn = screen.getByText('Rendimiento de Promociones');
    await act(async () => {
      fireEvent.click(promotionsTabBtn);
    });

    // Should display promotions skeleton
    expect(screen.getByTestId('analytics-skeleton-promotions')).toBeInTheDocument();

    // Switch to staff tab while loading
    const staffTabBtn = screen.getByText('Actividad de Equipo');
    await act(async () => {
      fireEvent.click(staffTabBtn);
    });

    // Should display staff skeleton
    expect(screen.getByTestId('analytics-skeleton-staff')).toBeInTheDocument();

    await act(async () => {
      resolveRetention!(mockRetention);
    });
  });

  it('displays retry button on error and reloads data upon clicking it', async () => {
    const fetchOverviewSpy = vi
      .spyOn(reportsService, 'fetchOverviewReport')
      .mockRejectedValueOnce(new Error('Fallo de conexión'))
      .mockResolvedValueOnce(mockOverview as any);

    render(<Analytics merchantId={merchantId} />);

    await waitFor(() => {
      expect(screen.getByText('Fallo de conexión')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /reintentar/i });
    expect(retryBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(retryBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Clientes Nuevos')).toBeInTheDocument();
    });

    expect(fetchOverviewSpy).toHaveBeenCalledTimes(2);
  });

  it('renders accessible empty state message when timeSeries is empty', async () => {
    const emptyOverview = {
      ...mockOverview,
      timeSeries: [],
    };
    vi.spyOn(reportsService, 'fetchOverviewReport').mockResolvedValue(emptyOverview as any);

    render(<Analytics merchantId={merchantId} />);

    await waitFor(() => {
      expect(screen.getByText('Sin datos registrados para el período seleccionado')).toBeInTheDocument();
    });
  });

  it('loads data successfully using brandId or locationId when merchantId is null', async () => {
    render(<Analytics merchantId={null} brandId="brand-custom-123" />);

    await waitFor(() => {
      expect(screen.getByText('Clientes Nuevos')).toBeInTheDocument();
    });

    expect(reportsService.fetchOverviewReport).toHaveBeenCalledWith(
      'brand-custom-123',
      expect.any(Object),
    );
  });
});

