import { BadRequestException } from '@nestjs/common';
import { ScanType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PassesService } from '../passes/passes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ScanActionDto, ScanActionType } from './dto/scan-action.dto.js';
import { ScanService } from './scan.service.js';

describe('ScanService Concurrency & Pessimistic Locking (FOR UPDATE)', () => {
  let service: ScanService;
  let prisma: PrismaService;
  let passesService: PassesService;

  const mockMerchantId = 'a0000000-0000-0000-0000-000000000001';
  const mockUserId1 = 'u0000000-0000-0000-0000-000000000001';
  const mockUserId2 = 'u0000000-0000-0000-0000-000000000002';
  const mockPassId = 'p0000000-0000-0000-0000-000000000001';
  const mockToken = 'concurrent-pass-token-123';

  const mockPromotion = {
    id: 'promo-concurrent-1',
    merchantId: mockMerchantId,
    name: '5 Sellos = 1 Postre',
    targetStamps: 5,
    rewardName: 'Postre Gratis',
    isActive: true,
    createdAt: new Date(),
  };

  const mockPass = {
    id: mockPassId,
    passToken: mockToken,
    merchantId: mockMerchantId,
    customerId: 'c0000000-0000-0000-0000-000000000001',
    merchant: {
      id: mockMerchantId,
      name: 'Restaurante Concurrente',
      stampValidityDays: 30,
    },
    customer: {
      id: 'c0000000-0000-0000-0000-000000000001',
      rut: '12345678-5',
      phone: '+56912345678',
    },
  };

  beforeEach(() => {
    passesService = {
      notifyPassUpdate: vi.fn().mockResolvedValue(undefined),
    } as unknown as PassesService;
  });

  it('strictly executes SELECT FOR UPDATE on Pass inside the database transaction', async () => {
    const rawQuerySpy = vi.fn().mockResolvedValue([]);
    const txMock = {
      $queryRaw: rawQuerySpy,
      scan: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'scan-1' }),
      },
      stamp: {
        create: vi.fn().mockResolvedValue({ id: 'stamp-1' }),
        count: vi.fn().mockResolvedValue(1),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    prisma = {
      merchantUser: {
        findUnique: vi.fn().mockResolvedValue({ id: 'mu-1', userId: mockUserId1, merchantId: mockMerchantId }),
      },
      pass: {
        findUnique: vi.fn().mockResolvedValue(mockPass as any),
      },
      promotion: {
        findFirst: vi.fn().mockResolvedValue(mockPromotion as any),
        findMany: vi.fn().mockResolvedValue([mockPromotion as any]),
      },
      $transaction: vi.fn((cb) => cb(txMock)),
    } as unknown as PrismaService;

    service = new ScanService(prisma, passesService);

    const dto: ScanActionDto = {
      passToken: mockToken,
      action: ScanActionType.STAMP,
      merchantId: mockMerchantId,
    };

    await service.processScan(dto, mockUserId1);

    // Verify row-level lock FOR UPDATE was acquired
    expect(rawQuerySpy).toHaveBeenCalledTimes(1);
    const sqlChunks = rawQuerySpy.mock.calls[0][0];
    expect(sqlChunks.join('')).toContain('FOR UPDATE');
    expect(sqlChunks.join('')).toContain('SELECT id FROM "Pass" WHERE id =');
  });

  it('prevents double-spending of stamps when two concurrent REDEEM requests are submitted', async () => {
    // Simulated state in database
    let isRowLocked = false;
    let redeemed = false;

    // 5 active stamps initially in DB
    const stampsInDb: Array<{ id: string; earnedAt: Date; consumedAt: Date | null }> = [
      { id: 's1', earnedAt: new Date('2026-01-01'), consumedAt: null },
      { id: 's2', earnedAt: new Date('2026-01-02'), consumedAt: null },
      { id: 's3', earnedAt: new Date('2026-01-03'), consumedAt: null },
      { id: 's4', earnedAt: new Date('2026-01-04'), consumedAt: null },
      { id: 's5', earnedAt: new Date('2026-01-05'), consumedAt: null },
    ];

    const createTx = () => {
      return {
        $queryRaw: vi.fn(async () => {
          // Simulate pessimistic row lock: wait if another transaction holds the lock
          while (isRowLocked) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          isRowLocked = true;
          return [];
        }),
        scan: {
          findFirst: vi.fn(async ({ where }) => {
            if (where.type === ScanType.REWARD_REDEEMED && redeemed) {
              return { id: 'scan-prev-redeem', createdAt: new Date() };
            }
            return null;
          }),
          create: vi.fn(async () => {
            redeemed = true;
            return { id: 'scan-redeem-executed' };
          }),
        },
        stamp: {
          count: vi.fn(async () => {
            return stampsInDb.filter((s) => s.consumedAt === null).length;
          }),
          findMany: vi.fn(async () => {
            return stampsInDb.filter((s) => s.consumedAt === null);
          }),
          findFirst: vi.fn().mockResolvedValue(null),
          updateMany: vi.fn(async ({ where }) => {
            const ids: string[] = where.id.in;
            let updatedCount = 0;
            for (const id of ids) {
              const s = stampsInDb.find((item) => item.id === id);
              if (s && s.consumedAt === null) {
                s.consumedAt = new Date();
                updatedCount++;
              }
            }
            return { count: updatedCount };
          }),
        },
      };
    };

    prisma = {
      merchantUser: {
        findUnique: vi.fn().mockResolvedValue({ id: 'mu-1', userId: mockUserId1, merchantId: mockMerchantId }),
      },
      pass: {
        findUnique: vi.fn().mockResolvedValue(mockPass as any),
      },
      promotion: {
        findFirst: vi.fn().mockResolvedValue(mockPromotion as any),
        findMany: vi.fn().mockResolvedValue([mockPromotion as any]),
      },
      $transaction: vi.fn(async (cb) => {
        const tx = createTx();
        try {
          return await cb(tx);
        } finally {
          isRowLocked = false; // release lock when transaction completes
        }
      }),
    } as unknown as PrismaService;

    service = new ScanService(prisma, passesService);

    const dto1: ScanActionDto = {
      passToken: mockToken,
      action: ScanActionType.REDEEM,
      merchantId: mockMerchantId,
    };

    const dto2: ScanActionDto = {
      passToken: mockToken,
      action: ScanActionType.REDEEM,
      merchantId: mockMerchantId,
    };

    // Execute two concurrent redeem requests simultaneously
    const results = await Promise.allSettled([
      service.processScan(dto1, mockUserId1),
      service.processScan(dto2, mockUserId2),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    // Either the second transaction was rejected (insufficient stamps) or returned alreadyScanned: true (anti-fraud window)
    // In neither case were stamps double-consumed!
    const unconsumedStamps = stampsInDb.filter((s) => s.consumedAt === null);
    expect(unconsumedStamps.length).toBe(0); // All 5 stamps consumed exactly once

    // Exactly one transaction consumed stamps
    const successfulRedeem = fulfilled.find((r) => r.value.alreadyScanned === false);
    expect(successfulRedeem).toBeDefined();
    expect(successfulRedeem?.value.consumedStampsCount).toBe(5);

    // The other was either prevented via anti-fraud or rejected with insufficient stamps
    if (rejected.length > 0) {
      expect(rejected[0].reason).toBeInstanceOf(BadRequestException);
    } else {
      const duplicateRedeem = fulfilled.find((r) => r.value.alreadyScanned === true);
      expect(duplicateRedeem).toBeDefined();
    }
  });
});
