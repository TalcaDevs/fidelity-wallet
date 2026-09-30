import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RetentionAnalyticsService } from './retention-analytics.service.js';

describe('RetentionAnalyticsService', () => {
  let service: RetentionAnalyticsService;
  let prisma: PrismaService;

  const scope = {
    brandId: 'b0000000-0000-0000-0000-000000000001',
    merchantId: 'a0000000-0000-0000-0000-000000000001',
  };

  beforeEach(() => {
    prisma = {
      scan: { findMany: vi.fn() },
      pass: { findMany: vi.fn() },
    } as unknown as PrismaService;

    service = new RetentionAnalyticsService(prisma);
  });

  it('retorna reporte vacío y seguro cuando no hay pases ni scans', async () => {
    (prisma.scan.findMany as any).mockResolvedValue([]);
    (prisma.pass.findMany as any).mockResolvedValue([]);

    const result = await service.getRetention(scope, { dormantDays: 30 });

    expect(result.weeklyRetention).toEqual([]);
    expect(result.dormantCustomers).toEqual({ count: 0, customers: [] });
    expect(result.cohorts).toEqual([]);
    expect(result.visitFrequencyDistribution).toEqual([
      { range: '1 visita', customerCount: 0, percentage: 0 },
      { range: '2-3 visitas', customerCount: 0, percentage: 0 },
      { range: '4+ visitas', customerCount: 0, percentage: 0 },
    ]);
  });
});
