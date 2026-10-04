import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { InternalSummaryService } from './internal-summary.service.js';

// 2026-09-30 15:00 UTC = 12:00 en Santiago (UTC-3).
const NOW = new Date('2026-09-30T15:00:00Z');

function setup() {
  const groupBy = vi
    .fn()
    .mockResolvedValueOnce([
      { status: 'ACTIVE', _count: { _all: 4 } },
      { status: 'SUSPENDED', _count: { _all: 1 } },
    ])
    .mockResolvedValueOnce([
      { planId: 'TRIAL', _count: { _all: 2 } },
      { planId: 'PRO', _count: { _all: 3 } },
    ]);
  const ticketCount = vi
    .fn()
    .mockResolvedValueOnce(6)
    .mockResolvedValueOnce(2)
    .mockResolvedValueOnce(1)
    .mockResolvedValueOnce(3);
  const prisma = {
    brand: {
      groupBy,
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'b-2',
          name: 'Heladería Sur',
          trialEndsAt: new Date('2026-10-03T12:00:00Z'),
        },
      ]),
      count: vi.fn().mockResolvedValue(1),
    },
    ticket: { count: ticketCount },
    $queryRaw: vi.fn().mockResolvedValue([
      { day: '2026-09-30', stamps: 12, redemptions: 2, new_customers: 3 },
      { day: '2026-09-27', stamps: 5, redemptions: 0, new_customers: 1 },
    ]),
  };
  return {
    prisma,
    service: new InternalSummaryService(prisma as unknown as PrismaService),
  };
}

describe('InternalSummaryService', () => {
  it('aggregates brands by status and plan, including plans with no brands', async () => {
    const { service } = setup();
    const { brands } = await service.summary(NOW);
    expect(brands).toEqual({
      total: 5,
      active: 4,
      suspended: 1,
      byPlan: { TRIAL: 2, STARTER: 0, PRO: 3, BUSINESS: 0 },
    });
  });

  it('lists trials ending within a week and counts the expired ones', async () => {
    const { service, prisma } = setup();
    const { trials } = await service.summary(NOW);
    expect(trials).toEqual({
      endingSoon: [
        {
          id: 'b-2',
          name: 'Heladería Sur',
          trialEndsAt: '2026-10-03T12:00:00.000Z',
        },
      ],
      expired: 1,
    });
    expect(prisma.brand.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          planId: 'TRIAL',
          status: 'ACTIVE',
          trialEndsAt: { gte: NOW, lte: new Date('2026-10-07T15:00:00Z') },
        },
      }),
    );
  });

  it('counts the open ticket queue', async () => {
    const { service } = setup();
    const { tickets } = await service.summary(NOW);
    expect(tickets).toEqual({
      open: 6,
      unassigned: 2,
      urgent: 1,
      waitingOnMerchant: 3,
    });
  });

  it('returns 7 consecutive Santiago days, filling the empty ones with zeros', async () => {
    const { service } = setup();
    const { activity } = await service.summary(NOW);
    expect(activity.map((d) => d.date)).toEqual([
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
    ]);
    expect(activity[3]).toEqual({
      date: '2026-09-27',
      stamps: 5,
      redemptions: 0,
      newCustomers: 1,
    });
    expect(activity[6]).toEqual({
      date: '2026-09-30',
      stamps: 12,
      redemptions: 2,
      newCustomers: 3,
    });
    expect(activity[0]).toEqual({
      date: '2026-09-24',
      stamps: 0,
      redemptions: 0,
      newCustomers: 0,
    });
  });
});
