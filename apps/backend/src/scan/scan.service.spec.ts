import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ScanType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { ScanActionType } from './dto/scan-action.dto.js';
import { ScanService } from './scan.service.js';

describe('ScanService', () => {
  let service: ScanService;
  let prisma: PrismaService;

  const mockMerchantId = 'a0000000-0000-0000-0000-000000000001';
  const mockOtherMerchantId = 'a0000000-0000-0000-0000-000000000099';
  const mockUserId = 'u0000000-0000-0000-0000-000000000001';
  const mockPassId = 'p0000000-0000-0000-0000-000000000001';
  const mockToken = 'valid-token-123';

  const mockPromotion = {
    id: 'promo-1',
    merchantId: mockMerchantId,
    name: '10 Cafes = 1 Gratis',
    targetStamps: 5,
    rewardName: 'Café Gratis',
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
      name: 'Cafeteria Test',
      stampValidityDays: 30,
    },
    customer: {
      id: 'c0000000-0000-0000-0000-000000000001',
      rut: '12345678-5',
      phone: '+56912345678',
    },
  };

  beforeEach(() => {
    prisma = {
      merchantUser: {
        findUnique: vi.fn(),
      },
      pass: {
        findUnique: vi.fn(),
      },
      promotion: {
        findFirst: vi.fn(),
      },
      scan: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      stamp: {
        count: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prisma)),
    } as unknown as PrismaService;

    service = new ScanService(prisma);
  });

  it('should throw ForbiddenException if callerUserId is not member of merchant', async () => {
    vi.spyOn(prisma.merchantUser, 'findUnique').mockResolvedValue(null);

    await expect(
      service.processScan(
        {
          passToken: mockToken,
          action: ScanActionType.STAMP,
          merchantId: mockMerchantId,
        },
        'unauthorized-user-id',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow scan when callerUserId is verified member of merchant', async () => {
    vi.spyOn(prisma.merchantUser, 'findUnique').mockResolvedValue({
      id: 'mu-1',
      userId: mockUserId,
      merchantId: mockMerchantId,
      role: 'STAFF',
      createdAt: new Date(),
    } as any);
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
    vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(mockPromotion as any);
    vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'scan-1' } as any);
    vi.spyOn(prisma.stamp, 'create').mockResolvedValue({ id: 'stamp-1' } as any);
    vi.spyOn(prisma.stamp, 'count').mockResolvedValue(1);

    const result = await service.processScan(
      {
        passToken: mockToken,
        action: ScanActionType.STAMP,
        merchantId: mockMerchantId,
      },
      mockUserId,
    );

    expect(result.success).toBe(true);
    expect(prisma.merchantUser.findUnique).toHaveBeenCalledWith({
      where: {
        userId_merchantId: {
          userId: mockUserId,
          merchantId: mockMerchantId,
        },
      },
    });
  });

  it('should throw NotFoundException if passToken is invalid', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(null);

    await expect(
      service.processScan({
        passToken: 'invalid-token',
        action: ScanActionType.STAMP,
        merchantId: mockMerchantId,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException if pass belongs to another merchant', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue({
      ...mockPass,
      merchantId: mockOtherMerchantId,
    } as any);

    await expect(
      service.processScan({
        passToken: mockToken,
        action: ScanActionType.STAMP,
        merchantId: mockMerchantId,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException if merchant has no active promotion', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
    vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(null);

    await expect(
      service.processScan({
        passToken: mockToken,
        action: ScanActionType.STAMP,
        merchantId: mockMerchantId,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should prevent duplicate stamp within 90-second anti-fraud window', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
    vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(mockPromotion as any);

    // Scan occurred 30 seconds ago
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue({
      id: 'scan-prev',
      passId: mockPassId,
      merchantId: mockMerchantId,
      type: ScanType.STAMP_ADDED,
      createdAt: thirtySecondsAgo,
    } as any);

    vi.spyOn(prisma.stamp, 'count').mockResolvedValue(3);

    const stampCreateSpy = vi.spyOn(prisma.stamp, 'create');
    const scanCreateSpy = vi.spyOn(prisma.scan, 'create');

    const result = await service.processScan({
      passToken: mockToken,
      action: ScanActionType.STAMP,
      merchantId: mockMerchantId,
    });

    expect(result.alreadyScanned).toBe(true);
    expect(result.activeStamps).toBe(3);
    expect(result.rewardUnlocked).toBe(false);
    expect(stampCreateSpy).not.toHaveBeenCalled();
    expect(scanCreateSpy).not.toHaveBeenCalled();
  });

  it('should successfully add a stamp with frozen expiresAt and createdByUserId', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
    vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(mockPromotion as any);
    vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null); // no recent scan

    const mockCreatedScan = { id: 'scan-new-1', passId: mockPassId };
    const scanCreateSpy = vi.spyOn(prisma.scan, 'create').mockResolvedValue(mockCreatedScan as any);
    const stampCreateSpy = vi.spyOn(prisma.stamp, 'create').mockResolvedValue({ id: 'stamp-new-1' } as any);
    vi.spyOn(prisma.stamp, 'count').mockResolvedValue(5); // reached targetStamps = 5
    vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

    const result = await service.processScan({
      passToken: mockToken,
      action: ScanActionType.STAMP,
      merchantId: mockMerchantId,
      createdByUserId: mockUserId,
    });

    expect(result.alreadyScanned).toBe(false);
    expect(result.activeStamps).toBe(5);
    expect(result.rewardUnlocked).toBe(true); // activeStamps >= targetStamps (5 >= 5)
    expect(result.scanId).toBe('scan-new-1');
    expect(result.customer?.rut).toBe('12.***.*78-5');

    // Verify createdByUserId was passed to Scan
    expect(scanCreateSpy).toHaveBeenCalledWith({
      data: {
        passId: mockPassId,
        merchantId: mockMerchantId,
        type: ScanType.STAMP_ADDED,
        createdByUserId: mockUserId,
      },
    });

    // Verify Stamp was created with expiresAt frozen to ~30 days in future and createdByUserId
    expect(stampCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passId: mockPassId,
          merchantId: mockMerchantId,
          createdByUserId: mockUserId,
          sourceScanId: 'scan-new-1',
          expiresAt: expect.any(Date),
        }),
      }),
    );
  });

  it('should handle stampValidityDays = null (stamps never expire)', async () => {
    const passWithoutExpiry = {
      ...mockPass,
      merchant: { ...mockPass.merchant, stampValidityDays: null },
    };
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(passWithoutExpiry as any);
    vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(mockPromotion as any);
    vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null);

    vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'scan-1' } as any);
    const stampCreateSpy = vi.spyOn(prisma.stamp, 'create').mockResolvedValue({ id: 'stamp-1' } as any);
    vi.spyOn(prisma.stamp, 'count').mockResolvedValue(1);

    await service.processScan({
      passToken: mockToken,
      action: ScanActionType.STAMP,
      merchantId: mockMerchantId,
    });

    expect(stampCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          expiresAt: null,
        }),
      }),
    );
  });

  it('should perform FIFO consumption on REDEEM, consuming the oldest active stamps', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
    vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue({
      ...mockPromotion,
      targetStamps: 3,
    } as any);

    // 5 active stamps, ordered by earnedAt ASC (FIFO)
    const mockStamps = [
      { id: 'stamp-1', earnedAt: new Date('2026-01-01T00:00:00Z') }, // oldest
      { id: 'stamp-2', earnedAt: new Date('2026-01-02T00:00:00Z') },
      { id: 'stamp-3', earnedAt: new Date('2026-01-03T00:00:00Z') },
      { id: 'stamp-4', earnedAt: new Date('2026-01-04T00:00:00Z') },
      { id: 'stamp-5', earnedAt: new Date('2026-01-05T00:00:00Z') }, // newest
    ];

    vi.spyOn(prisma.stamp, 'findMany').mockResolvedValue(mockStamps as any);
    vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'redeem-scan-1' } as any);
    const stampUpdateManySpy = vi.spyOn(prisma.stamp, 'updateMany').mockResolvedValue({ count: 3 } as any);
    vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

    const result = await service.processScan({
      passToken: mockToken,
      action: ScanActionType.REDEEM,
      merchantId: mockMerchantId,
      createdByUserId: mockUserId,
    });

    expect(result.action).toBe(ScanActionType.REDEEM);
    expect(result.activeStamps).toBe(2); // 5 - 3 = 2
    expect(result.consumedStampsCount).toBe(3);
    expect(result.rewardUnlocked).toBe(false); // 2 < 3

    // Verify FIFO: consumed stamps MUST be the oldest ones: ['stamp-1', 'stamp-2', 'stamp-3']
    expect(stampUpdateManySpy).toHaveBeenCalledWith({
      where: { id: { in: ['stamp-1', 'stamp-2', 'stamp-3'] } },
      data: expect.objectContaining({
        consumedAt: expect.any(Date),
        consumedByScanId: 'redeem-scan-1',
      }),
    });
  });

  it('should throw BadRequestException on REDEEM if active stamps < targetStamps', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
    vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue({
      ...mockPromotion,
      targetStamps: 5,
    } as any);

    // Only 2 stamps available
    vi.spyOn(prisma.stamp, 'findMany').mockResolvedValue([
      { id: 'stamp-1' },
      { id: 'stamp-2' },
    ] as any);

    await expect(
      service.processScan({
        passToken: mockToken,
        action: ScanActionType.REDEEM,
        merchantId: mockMerchantId,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
