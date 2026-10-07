import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BillingService } from '../billing/billing.service.js';
import { diffFields } from '../common/audit/audit.js';
import type { UserDirectoryService } from '../common/users/user-directory.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { InternalBrandsService } from './internal-brands.service.js';
import {
  InternalCustomersService,
  identifierFilter,
} from './internal-customers.service.js';

describe('diffFields', () => {
  it('keeps only changed fields, with dates as ISO', () => {
    const current = {
      name: 'A',
      planId: 'TRIAL',
      trialEndsAt: new Date('2026-10-01T00:00:00Z'),
      taxId: null,
    };
    expect(
      diffFields(current, {
        name: 'A',
        planId: 'PRO',
        trialEndsAt: new Date('2026-10-01T00:00:00Z'),
        taxId: undefined,
      }),
    ).toEqual({ before: { planId: 'TRIAL' }, after: { planId: 'PRO' } });
    expect(diffFields(current, { name: 'A' })).toBeNull();
  });
});

describe('InternalBrandsService.update', () => {
  let prisma: any;
  let service: InternalBrandsService;

  beforeEach(() => {
    prisma = {
      brand: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'b-1',
          name: 'Café',
          status: 'ACTIVE',
          planId: 'TRIAL',
        }),
        update: vi.fn().mockReturnValue('brand-update'),
      },
      auditLog: { create: vi.fn().mockReturnValue('audit-create') },
      $queryRaw: vi.fn().mockResolvedValue([]),
      $transaction: vi.fn((callback: (tx: unknown) => unknown) =>
        callback(prisma),
      ),
    };
    service = new InternalBrandsService(
      prisma as PrismaService,
      {} as UserDirectoryService,
      {} as BillingService,
    );
    vi.spyOn(service, 'get').mockResolvedValue({} as never);
  });

  it('writes the change and its audit entry in one transaction', async () => {
    await service.update('b-1', 'admin', {
      status: 'SUSPENDED',
      reason: 'No pago',
    });

    expect(prisma.brand.update).toHaveBeenCalledWith({
      where: { id: 'b-1' },
      data: { status: 'SUSPENDED' },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'admin',
        action: 'brand.suspended',
        before: { status: 'ACTIVE' },
        after: { status: 'SUSPENDED' },
        reason: 'No pago',
      }),
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });

  it('does not audit a no-op', async () => {
    await service.update('b-1', 'admin', { planId: 'TRIAL' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('404s on a missing brand', async () => {
    prisma.brand.findUnique.mockResolvedValue(null);
    await expect(service.update('b-x', 'admin', { name: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('InternalCustomersService', () => {
  let prisma: any;
  let service: InternalCustomersService;

  beforeEach(() => {
    prisma = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'c-1',
          rut: '12345678-5',
          phone: '+56912345678',
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'c-1',
            rut: '12345678-5',
            phone: '+56912345678',
            createdAt: new Date('2026-10-01T00:00:00Z'),
            passes: [
              {
                id: 'p-1',
                brandId: 'b-1',
                createdAt: new Date('2026-10-01T00:00:00Z'),
                brand: { name: 'Café' },
              },
            ],
          },
        ]),
        count: vi.fn().mockResolvedValue(1),
      },
      $queryRaw: vi.fn().mockResolvedValue([
        {
          passId: 'p-1',
          activeStamps: 3,
          activePoints: 200,
          stampsEnabled: true,
          pointsEnabled: true,
        },
      ]),
      auditLog: { create: vi.fn() },
    };
    service = new InternalCustomersService(
      prisma as PrismaService,
      {} as UserDirectoryService,
    );
  });

  it('only searches exact, normalized identifiers', () => {
    expect(identifierFilter('12.345.678-5')).toEqual({ rut: '12345678-5' });
    expect(identifierFilter('9 1234 5678')).toEqual({ phone: '+56912345678' });
    expect(() => identifierFilter('1234')).toThrow(BadRequestException);
  });

  it('refuses to list every customer without a filter', async () => {
    await expect(service.search({ page: 1, pageSize: 20 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('always returns masked data with each brand balance', async () => {
    const result = await service.search({
      page: 1,
      pageSize: 20,
      brandId: 'b-1',
    });
    expect(result.items[0]).toMatchObject({
      rut: '12.***.*78-5',
      phone: '+56 9 **** 5678',
      cards: [
        {
          brandId: 'b-1',
          brandName: 'Café',
          activeStamps: 3,
          activePoints: 200,
          stampsEnabled: true,
          pointsEnabled: true,
        },
      ],
    });
  });

  it('records who revealed a customer and why', async () => {
    const revealed = await service.reveal('c-1', 'admin', 'Ticket #1000');
    expect(revealed.rut).toBe('12345678-5');
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'customer.reveal',
        entityId: 'c-1',
        reason: 'Ticket #1000',
      }),
    });
  });

  it('maps independent balances and modality flags returned by the balance view', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        passId: 'p-1',
        activeStamps: 0,
        activePoints: 200,
        stampsEnabled: false,
        pointsEnabled: true,
      },
    ]);
    const result = await service.search({
      page: 1,
      pageSize: 20,
      brandId: 'b-1',
    });
    expect(result.items[0].cards[0]).toMatchObject({
      activeStamps: 0,
      activePoints: 200,
      stampsEnabled: false,
      pointsEnabled: true,
    });
  });
});
