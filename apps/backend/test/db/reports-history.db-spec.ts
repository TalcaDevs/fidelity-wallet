import 'reflect-metadata';
import { afterAll, describe, expect, it } from 'vitest';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { ReportsOverviewService } from '../../src/reports/services/reports-overview.service.js';
import { createBrand, inRollback, prisma } from './db-helpers.js';

afterAll(async () => { await prisma.$disconnect(); });

describe('reportes históricos de saldos en PostgreSQL', () => {
  it('conserva ambos períodos de vencimientos al ocultar y reactivar sellos', async () => {
    await inRollback(async (tx) => {
      const fixture = await createBrand(tx, 'reports-history');
      await tx.brand.update({ where: { id: fixture.brandId }, data: { pointsEnabled: true } });
      const base = {
        passId: fixture.passId,
        merchantId: fixture.mainId,
        brandId: fixture.brandId,
        programId: fixture.programId,
      };
      await tx.stamp.createMany({ data: [
        { ...base, currency: 'STAMPS', amount: 12, expiresAt: new Date('2026-09-03T12:00:00Z') },
        { ...base, currency: 'STAMPS', amount: 3, expiresAt: new Date('2026-08-29T12:00:00Z') },
        { ...base, currency: 'POINTS', amount: 500, expiresAt: new Date('2026-09-03T12:00:00Z') },
        { ...base, currency: 'STAMPS', amount: 50, expiresAt: new Date('2026-09-03T12:00:00Z'), consumedAt: new Date('2026-09-02T12:00:00Z') },
      ] });
      const service = new ReportsOverviewService(tx as unknown as PrismaService);
      for (const stampsEnabled of [true, false, true]) {
        await tx.loyaltyProgram.update({ where: { id: fixture.programId }, data: { stampsEnabled, pointsEnabled: true } });
        const overview = await service.getOverview(
          { brandId: fixture.brandId, merchantId: null }, { from: '2026-09-01', to: '2026-09-05' },
        );
        expect(overview.kpis.expiredStamps).toEqual({ current: 12, previous: 3, changePercentage: 300 });
      }
    });
  });
});
