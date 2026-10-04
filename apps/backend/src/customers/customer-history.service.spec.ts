import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserDirectoryService } from '../common/users/user-directory.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { ReceiptStorageService } from '../scan/receipt-storage.service.js';
import { CustomerHistoryService } from './customer-history.service.js';

const brandId = 'b0000000-0000-4000-8000-000000000001';
const customerId = 'c0000000-0000-4000-8000-000000000001';
const ownerId = 'u0000000-0000-4000-8000-000000000001';
const query = { brandId, page: 1, pageSize: 20 };

const customer = {
  id: customerId,
  name: 'María Pérez',
  email: 'maria@gmail.com',
  phone: '+56912345678',
  rut: '12345678-5',
  birthDay: 14,
  birthMonth: 2,
  birthYear: null,
};

const stampScan = {
  id: 'scan-1',
  type: 'STAMP_ADDED',
  createdAt: new Date('2026-10-02T15:00:00Z'),
  method: 'QR',
  createdByUserId: 'staff-1',
  stampCount: 1,
  purchaseAmount: 12500,
  note: 'Mesa 4',
  merchant: { name: 'Centro' },
  promotion: null,
  receipt: { storagePath: `${brandId}/p-1/boleta.jpg` },
};

const redeemScan = {
  id: 'scan-2',
  type: 'REWARD_REDEEMED',
  createdAt: new Date('2026-10-03T15:00:00Z'),
  method: 'MANUAL',
  createdByUserId: null,
  stampCount: 1,
  purchaseAmount: null,
  note: null,
  merchant: { name: 'Centro' },
  promotion: { rewardName: 'Café gratis' },
  receipt: null,
};

describe('CustomerHistoryService', () => {
  let prisma: any;
  let receipts: { signedUrls: ReturnType<typeof vi.fn> };
  let service: CustomerHistoryService;

  beforeEach(() => {
    prisma = {
      brandMember: { findUnique: vi.fn().mockResolvedValue({ role: 'OWNER' }) },
      brand: { findUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE' }) },
      loyaltyProgram: { findFirst: vi.fn().mockResolvedValue({ id: 'prog-1' }) },
      pass: {
        findUnique: vi.fn().mockResolvedValue({ id: 'p-1', merchantId: 'loc-1', createdAt: new Date('2026-09-01'), customer }),
      },
      scan: {
        findMany: vi.fn().mockResolvedValue([redeemScan, stampScan]),
        groupBy: vi.fn().mockResolvedValue([
          { type: 'STAMP_ADDED', _count: { _all: 1 }, _sum: { purchaseAmount: 12500 } },
          { type: 'REWARD_REDEEMED', _count: { _all: 1 }, _sum: { purchaseAmount: null } },
        ]),
      },
      stamp: {
        count: vi.fn().mockResolvedValue(3),
        groupBy: vi.fn().mockResolvedValue([{ consumedByScanId: 'scan-2', _count: { _all: 5 } }]),
      },
      auditLog: { create: vi.fn() },
    };
    receipts = {
      signedUrls: vi.fn().mockResolvedValue(new Map([[`${brandId}/p-1/boleta.jpg`, 'https://signed/boleta']])),
    };
    service = new CustomerHistoryService(
      prisma as PrismaService,
      { lookup: vi.fn().mockResolvedValue(new Map([['staff-1', { email: 'cajero@local.cl' }]])) } as unknown as UserDirectoryService,
      receipts as unknown as ReceiptStorageService,
      { get: () => '6' } as unknown as ConfigService,
    );
  });

  it('gives the owner the full profile, totals and every movement', async () => {
    const result = await service.forOwner(customerId, query, ownerId);

    expect(result.customer).toMatchObject({ name: 'María Pérez', phone: '+56912345678', email: 'maria@gmail.com', activeStamps: 3 });
    expect(result.totals).toEqual({ visits: 1, redemptions: 1, purchaseAmount: 12500 });
    expect(result.customer.homeLocationId).toBe('loc-1');
    expect(result.maxStampsPerLoad).toBe(6);
    expect(result.history.total).toBe(2);
    expect(result.history.items[0]).toMatchObject({ type: 'REWARD_REDEEMED', stamps: 5, rewardName: 'Café gratis', receiptUrl: null });
    expect(result.history.items[1]).toMatchObject({
      type: 'STAMP_ADDED',
      stamps: 1,
      purchaseAmount: 12500,
      note: 'Mesa 4',
      staffEmail: 'cajero@local.cl',
      receiptUrl: 'https://signed/boleta',
    });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('does not show the history to a STAFF member', async () => {
    prisma.brandMember.findUnique.mockResolvedValue({ role: 'STAFF' });

    await expect(service.forOwner(customerId, query, ownerId)).rejects.toThrow(ForbiddenException);
    expect(prisma.scan.findMany).not.toHaveBeenCalled();
  });

  it('answers 404 when the customer has no card in the brand', async () => {
    prisma.pass.findUnique.mockResolvedValue(null);

    await expect(service.forOwner(customerId, query, ownerId)).rejects.toThrow(NotFoundException);
  });

  it('masks identifiers for the internal team and records the view', async () => {
    const result = await service.forPlatform(customerId, query, 'admin-1');

    expect(result.customer).toMatchObject({
      name: 'María Pérez',
      phone: '+56 9 **** 5678',
      email: 'm***@gmail.com',
      rut: '12.***.*78-5',
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorType: 'PLATFORM',
        action: 'customer.history.view',
        entityId: customerId,
      }),
    });
  });

  it('still answers without photos when Storage fails', async () => {
    receipts.signedUrls.mockRejectedValue(new Error('storage down'));

    const result = await service.forOwner(customerId, query, ownerId);

    expect(result.history.items[1].receiptUrl).toBeNull();
  });
});
