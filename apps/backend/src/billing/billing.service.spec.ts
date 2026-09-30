import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { BillingService } from './billing.service.js';

const brandId = 'b0000000-0000-0000-0000-000000000001';
const ownerId = 'owner-uuid';

describe('BillingService', () => {
  let prisma: any;
  let service: BillingService;

  beforeEach(() => {
    prisma = {
      brandMember: {
        findUnique: vi.fn(({ where }: any) =>
          Promise.resolve(
            where.userId_brandId.userId === ownerId ? { role: 'OWNER' } : { role: 'STAFF' },
          ),
        ),
        count: vi.fn().mockResolvedValue(2),
      },
      brand: {
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ createdAt: new Date('2026-09-10T00:00:00Z') }),
      },
      loyaltyProgram: { count: vi.fn().mockResolvedValue(1) },
      merchant: { count: vi.fn().mockResolvedValue(3) },
      pass: { count: vi.fn().mockResolvedValue(42) },
    };
    service = new BillingService(prisma as PrismaService);
  });

  it('returns the simulated trial with the real usage of the brand', async () => {
    const result = await service.getSubscription(
      brandId,
      ownerId,
      new Date('2026-09-30T00:00:00Z'),
    );

    expect(result).toEqual({
      planId: 'TRIAL',
      status: 'TRIALING',
      billingCycle: 'MONTHLY',
      trialEndsAt: '2026-10-10T00:00:00.000Z',
      currentPeriodEnd: '2026-10-10T00:00:00.000Z',
      usage: { programs: 1, locations: 3, teamUsers: 2, customers: 42 },
    });
    expect(prisma.brandMember.count).toHaveBeenCalledWith({
      where: { brandId, role: 'STAFF' },
    });
    expect(prisma.loyaltyProgram.count).toHaveBeenCalledWith({
      where: { brandId, isActive: true },
    });
  });

  it('marks the subscription PAST_DUE once the trial is over', async () => {
    const result = await service.getSubscription(
      brandId,
      ownerId,
      new Date('2026-10-11T00:00:00Z'),
    );
    expect(result.status).toBe('PAST_DUE');
  });

  it('is only for the OWNER', async () => {
    await expect(service.getSubscription(brandId, 'staff')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
