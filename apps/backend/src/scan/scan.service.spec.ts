import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ScanType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PassesService } from '../passes/passes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ScanActionType } from './dto/scan-action.dto.js';
import { ScanService } from './scan.service.js';

describe('ScanService', () => {
  let service: ScanService;
  let prisma: PrismaService;
  let passesService: PassesService;

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
        findUnique: vi.fn().mockResolvedValue({
          id: 'mu-1',
          userId: mockUserId,
          merchantId: mockMerchantId,
          role: 'STAFF',
        }),
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
      $queryRaw: vi.fn().mockResolvedValue([]),
      $transaction: vi.fn((callback) => callback(prisma)),
    } as unknown as PrismaService;

    passesService = {
      notifyPassUpdate: vi.fn().mockResolvedValue(undefined),
    } as unknown as PassesService;

    service = new ScanService(prisma, passesService);
  });

  it('should throw UnauthorizedException if callerUserId is missing', async () => {
    await expect(
      service.processScan(
        {
          passToken: mockToken,
          action: ScanActionType.STAMP,
          merchantId: mockMerchantId,
        },
        '',
      ),
    ).rejects.toThrow(UnauthorizedException);
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

  it('should throw NotFoundException if passToken is invalid', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(null);

    await expect(
      service.processScan(
        {
          passToken: 'invalid-token',
          action: ScanActionType.STAMP,
          merchantId: mockMerchantId,
        },
        mockUserId,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException if pass belongs to another merchant', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue({
      ...mockPass,
      merchantId: mockOtherMerchantId,
    } as any);

    await expect(
      service.processScan(
        {
          passToken: mockToken,
          action: ScanActionType.STAMP,
          merchantId: mockMerchantId,
        },
        mockUserId,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw BadRequestException if merchant has no active promotion', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
    vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(null);

    await expect(
      service.processScan(
        {
          passToken: mockToken,
          action: ScanActionType.STAMP,
          merchantId: mockMerchantId,
        },
        mockUserId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should prevent duplicate stamp within 90-second anti-fraud window and return consistent contract', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
    vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(mockPromotion as any);

    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue({
      id: 'scan-prev-1',
      passId: mockPassId,
      merchantId: mockMerchantId,
      type: ScanType.STAMP_ADDED,
      createdAt: thirtySecondsAgo,
    } as any);

    vi.spyOn(prisma.stamp, 'count').mockResolvedValue(3);
    vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue({
      expiresAt: new Date(Date.now() + 86400000),
    } as any);

    const stampCreateSpy = vi.spyOn(prisma.stamp, 'create');
    const scanCreateSpy = vi.spyOn(prisma.scan, 'create');

    const result = await service.processScan(
      {
        passToken: mockToken,
        action: ScanActionType.STAMP,
        merchantId: mockMerchantId,
      },
      mockUserId,
    );

    expect(result.alreadyScanned).toBe(true);
    expect(result.activeStamps).toBe(3);
    expect(result.scanId).toBe('scan-prev-1');
    expect(result.nextExpiryAt).toBeDefined();
    expect(stampCreateSpy).not.toHaveBeenCalled();
    expect(scanCreateSpy).not.toHaveBeenCalled();
    expect(passesService.notifyPassUpdate).not.toHaveBeenCalled();
  });

  it('should successfully add a stamp with frozen expiresAt and callerUserId audit', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
    vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(mockPromotion as any);
    vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null); // no recent scan

    const mockCreatedScan = { id: 'scan-new-1', passId: mockPassId };
    const scanCreateSpy = vi.spyOn(prisma.scan, 'create').mockResolvedValue(mockCreatedScan as any);
    const stampCreateSpy = vi.spyOn(prisma.stamp, 'create').mockResolvedValue({ id: 'stamp-new-1' } as any);
    vi.spyOn(prisma.stamp, 'count').mockResolvedValue(5);
    vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

    const result = await service.processScan(
      {
        passToken: mockToken,
        action: ScanActionType.STAMP,
        merchantId: mockMerchantId,
      },
      mockUserId,
    );

    expect(result.alreadyScanned).toBe(false);
    expect(result.activeStamps).toBe(5);
    expect(result.rewardUnlocked).toBe(true);
    expect(result.scanId).toBe('scan-new-1');
    expect(result.customer?.rut).toBe('12.***.*78-5');
    expect(passesService.notifyPassUpdate).toHaveBeenCalledWith(mockPassId);

    expect(scanCreateSpy).toHaveBeenCalledWith({
      data: {
        passId: mockPassId,
        merchantId: mockMerchantId,
        type: ScanType.STAMP_ADDED,
        createdByUserId: mockUserId,
      },
    });

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

    await service.processScan(
      {
        passToken: mockToken,
        action: ScanActionType.STAMP,
        merchantId: mockMerchantId,
      },
      mockUserId,
    );

    expect(stampCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          expiresAt: null,
        }),
      }),
    );
  });

  it('should perform FIFO consumption on REDEEM with atomic count verification', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
    vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue({
      ...mockPromotion,
      targetStamps: 3,
    } as any);
    vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null); // No recent redeem

    const mockStamps = [
      { id: 'stamp-1', earnedAt: new Date('2026-01-01T00:00:00Z') }, // oldest
      { id: 'stamp-2', earnedAt: new Date('2026-01-02T00:00:00Z') },
      { id: 'stamp-3', earnedAt: new Date('2026-01-03T00:00:00Z') },
      { id: 'stamp-4', earnedAt: new Date('2026-01-04T00:00:00Z') },
      { id: 'stamp-5', earnedAt: new Date('2026-01-05T00:00:00Z') },
    ];

    vi.spyOn(prisma.stamp, 'findMany').mockResolvedValue(mockStamps as any);
    vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'redeem-scan-1' } as any);
    const stampUpdateManySpy = vi.spyOn(prisma.stamp, 'updateMany').mockResolvedValue({ count: 3 } as any);
    vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

    const result = await service.processScan(
      {
        passToken: mockToken,
        action: ScanActionType.REDEEM,
        merchantId: mockMerchantId,
      },
      mockUserId,
    );

    expect(result.action).toBe(ScanActionType.REDEEM);
    expect(result.activeStamps).toBe(2);
    expect(result.consumedStampsCount).toBe(3);
    expect(prisma.stamp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          passId: mockPassId,
          consumedAt: null,
          AND: [{ OR: [{ promotionId: 'promo-1' }, { promotionId: null }] }],
        }),
      }),
    );
    expect(stampUpdateManySpy).toHaveBeenCalledWith({
      where: { id: { in: ['stamp-1', 'stamp-2', 'stamp-3'] }, consumedAt: null },
      data: expect.objectContaining({
        consumedAt: expect.any(Date),
        consumedByScanId: 'redeem-scan-1',
      }),
    });
    expect(passesService.notifyPassUpdate).toHaveBeenCalledWith(mockPassId);
  });

  it('should throw ConflictException on REDEEM if concurrent process consumed stamps', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
    vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue({
      ...mockPromotion,
      targetStamps: 3,
    } as any);
    vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null);

    const mockStamps = [
      { id: 'stamp-1', earnedAt: new Date('2026-01-01T00:00:00Z') },
      { id: 'stamp-2', earnedAt: new Date('2026-01-02T00:00:00Z') },
      { id: 'stamp-3', earnedAt: new Date('2026-01-03T00:00:00Z') },
    ];

    vi.spyOn(prisma.stamp, 'findMany').mockResolvedValue(mockStamps as any);
    vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'redeem-scan-1' } as any);
    // Concurrent transaction already consumed one stamp, so count = 2 instead of 3
    vi.spyOn(prisma.stamp, 'updateMany').mockResolvedValue({ count: 2 } as any);

    await expect(
      service.processScan(
        {
          passToken: mockToken,
          action: ScanActionType.REDEEM,
          merchantId: mockMerchantId,
        },
        mockUserId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should prevent duplicate REDEEM within 90-second anti-fraud window', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
    vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(mockPromotion as any);

    const twentySecondsAgo = new Date(Date.now() - 20 * 1000);
    vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue({
      id: 'redeem-scan-prev',
      passId: mockPassId,
      merchantId: mockMerchantId,
      type: ScanType.REWARD_REDEEMED,
      createdAt: twentySecondsAgo,
    } as any);

    vi.spyOn(prisma.stamp, 'count').mockResolvedValue(0);

    const result = await service.processScan(
      {
        passToken: mockToken,
        action: ScanActionType.REDEEM,
        merchantId: mockMerchantId,
      },
      mockUserId,
    );

    expect(result.alreadyScanned).toBe(true);
    expect(result.action).toBe(ScanActionType.REDEEM);
    expect(result.scanId).toBe('redeem-scan-prev');
    expect(passesService.notifyPassUpdate).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException on REDEEM if active stamps < targetStamps', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
    vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue({
      ...mockPromotion,
      targetStamps: 5,
    } as any);
    vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null);

    vi.spyOn(prisma.stamp, 'findMany').mockResolvedValue([
      { id: 'stamp-1' },
      { id: 'stamp-2' },
    ] as any);

    await expect(
      service.processScan(
        {
          passToken: mockToken,
          action: ScanActionType.REDEEM,
          merchantId: mockMerchantId,
        },
        mockUserId,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
