import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PromotionsAnalyticsService } from './promotions-analytics.service.js';

describe('PromotionsAnalyticsService', () => {
  let service: PromotionsAnalyticsService;
  let prisma: PrismaService;

  const scope = {
    brandId: 'b0000000-0000-0000-0000-000000000001',
    merchantId: 'a0000000-0000-0000-0000-000000000001',
  };

  beforeEach(() => {
    prisma = {
      promotion: { findMany: vi.fn() },
      scan: { findMany: vi.fn() },
      stamp: { findMany: vi.fn() },
    } as unknown as PrismaService;

    service = new PromotionsAnalyticsService(prisma);
  });

  it('retorna arreglo vacío si no hay promociones creadas', async () => {
    (prisma.promotion.findMany as any).mockResolvedValue([]);
    (prisma.scan.findMany as any).mockResolvedValue([]);
    (prisma.stamp.findMany as any).mockResolvedValue([]);

    const result = await service.getPromotions(scope, {});
    expect(result.promotions).toEqual([]);
  });

  it('calcula métricas de promoción con días promedio null si no hay canjes', async () => {
    (prisma.promotion.findMany as any).mockResolvedValue([
      {
        id: 'promo-1',
        name: 'Promo Test',
        targetStamps: 5,
        rewardName: 'Café',
        isActive: true,
      },
    ]);
    (prisma.scan.findMany as any).mockResolvedValue([]);
    (prisma.stamp.findMany as any).mockResolvedValue([]);

    const result = await service.getPromotions(scope, {});
    expect(result.promotions.length).toBe(1);
    expect(result.promotions[0].redeemedCount).toBe(0);
    expect(result.promotions[0].averageDaysToRedeem).toBeNull();
    expect(result.promotions[0].breakageCount).toBe(0);
  });
});
