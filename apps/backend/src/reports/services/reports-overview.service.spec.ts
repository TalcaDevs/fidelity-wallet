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
      stamp: { count: vi.fn() },
    } as unknown as PrismaService;

    service = new ReportsOverviewService(prisma);
  });

  it('retorna KPIs vacíos/cero ante colecciones vacías y llena el período', async () => {
    (prisma.scan.findMany as any).mockResolvedValue([]);
    (prisma.scan.groupBy as any).mockResolvedValue([]);
    (prisma.pass.count as any).mockResolvedValue(0);
    (prisma.stamp.count as any).mockResolvedValue(0);

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
});
