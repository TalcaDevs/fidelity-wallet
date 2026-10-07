import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ReportsOverviewService } from './reports-overview.service.js';

describe('ReportsOverviewService', () => {
  let service: ReportsOverviewService;
  let prisma: PrismaService;

  const scope = {
    brandId: 'b0000000-0000-0000-0000-000000000001',
    merchantId: 'a0000000-0000-0000-0000-000000000001',
  };

  beforeEach(() => {
    prisma = {
      scan: {
        findMany: vi.fn(),
        groupBy: vi.fn(),
      },
      pass: { count: vi.fn() },
      stamp: { aggregate: vi.fn() },
    } as unknown as PrismaService;

    service = new ReportsOverviewService(prisma);
  });

  it('retorna KPIs vacíos/cero ante colecciones vacías y llena el período', async () => {
    (prisma.scan.findMany as any).mockResolvedValue([]);
    (prisma.scan.groupBy as any).mockResolvedValue([]);
    (prisma.pass.count as any).mockResolvedValue(0);
    (prisma.stamp.aggregate as any).mockResolvedValue({
      _sum: { amount: null },
    });

    const result = await service.getOverview(scope, {
      from: '2026-09-01',
      to: '2026-09-05',
    });

    expect(result.period).toEqual({
      from: '2026-09-01',
      to: '2026-09-05',
      timeZone: 'America/Santiago',
    });
    expect(result.kpis.newCustomers.current).toBe(0);
    expect(result.kpis.activeCustomers.current).toBe(0);
    expect(result.kpis.stampsDelivered.current).toBe(0);
    expect(result.kpis.rewardsRedeemed.current).toBe(0);
    expect(result.kpis.recurrenceRate.current).toBe(0);
    expect(result.kpis.expiredStamps.current).toBe(0);
    expect(result.timeSeries.length).toBe(5);
    expect(result.methodDistribution).toEqual({
      qrCount: 0,
      manualCount: 0,
      qrPercentage: 0,
      manualPercentage: 0,
    });
  });

  it('suma unidades expiradas de sellos activos y conserva visitas como cantidad de operaciones', async () => {
    vi.mocked(prisma.scan.findMany).mockResolvedValue([]);
    vi.mocked(prisma.scan.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.pass.count).mockResolvedValue(0);
    vi.mocked(prisma.stamp.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: 12 } } as never)
      .mockResolvedValueOnce({ _sum: { amount: 3 } } as never);

    const result = await service.getOverview(scope, {
      from: '2026-09-01',
      to: '2026-09-05',
    });
    expect(result.kpis.expiredStamps).toEqual({
      current: 12,
      previous: 3,
      changePercentage: 300,
    });
    expect(prisma.stamp.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        _sum: { amount: true },
        where: expect.objectContaining({
          currency: 'STAMPS',
          program: { stampsEnabled: true },
          consumedAt: null,
        }),
      }),
    );
    expect(result.kpis.stampsDelivered.current).toBe(0);
  });
});
