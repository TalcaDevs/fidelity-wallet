import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ScanMethod, ScanType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PassesService } from '../passes/passes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ScanActionType } from './dto/scan-action.dto.js';
import type { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ScanActionDto } from './dto/scan-action.dto.js';
import { ManualLookupLimiter } from './manual-lookup-limiter.js';
import { ScanService, resolveStampCooldownMs } from './scan.service.js';

// El cooldown se pasa explícito: el resultado no depende del .env de quien corre los tests.
const configWithCooldown = (minutes: string) =>
  ({ get: (key: string) => (key === 'STAMP_COOLDOWN_MINUTES' ? minutes : undefined) }) as unknown as ConfigService;

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
        findFirst: vi.fn(),
      },
      promotion: {
        findMany: vi.fn().mockResolvedValue([mockPromotion]),
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

    service = new ScanService(prisma, passesService, configWithCooldown('30'), new ManualLookupLimiter());
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
    vi.spyOn(prisma.promotion, 'findMany').mockResolvedValue([]);

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

  it('should block a duplicate stamp within the cooldown and return consistent contract', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);

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

  describe('30-minute stamp cooldown per pass', () => {
    const lastStampAt = (minutesAgo: number) =>
      vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue({
        id: 'scan-prev-1',
        passId: mockPassId,
        merchantId: mockMerchantId,
        type: ScanType.STAMP_ADDED,
        createdAt: new Date(Date.now() - minutesAgo * 60 * 1000),
      } as any);

    beforeEach(() => {
      vi.spyOn(prisma.stamp, 'count').mockResolvedValue(2);
      vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);
    });

    it('should block a second stamp 20 minutes after the last one and say when it unlocks', async () => {
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
      lastStampAt(20);

      const result = await service.processScan(
        { passToken: mockToken, action: ScanActionType.STAMP, merchantId: mockMerchantId },
        mockUserId,
      );

      expect(result.alreadyScanned).toBe(true);
      expect(prisma.stamp.create).not.toHaveBeenCalled();
      expect(result.message).toBe('Este cliente ya recibió un sello. Podrá sumar otro en 10 min');
      const unlocksInMs = result.nextStampAvailableAt!.getTime() - Date.now();
      expect(unlocksInMs).toBeGreaterThan(9 * 60 * 1000);
      expect(unlocksInMs).toBeLessThanOrEqual(10 * 60 * 1000);
    });

    it('should allow a new stamp once 30 minutes have passed', async () => {
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
      lastStampAt(31);
      vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'scan-new-2' } as any);
      vi.spyOn(prisma.stamp, 'create').mockResolvedValue({ id: 'stamp-new-2' } as any);

      const result = await service.processScan(
        { passToken: mockToken, action: ScanActionType.STAMP, merchantId: mockMerchantId },
        mockUserId,
      );

      expect(result.alreadyScanned).toBe(false);
      expect(result.nextStampAvailableAt).toBeUndefined();
      expect(prisma.stamp.create).toHaveBeenCalledTimes(1);
    });

    it('should apply the same block to a manual entry by RUT', async () => {
      vi.spyOn(prisma.pass, 'findFirst').mockResolvedValue(mockPass as any);
      lastStampAt(5);

      const result = await service.processScan(
        { customer: { rut: '12.345.678-5' }, action: ScanActionType.STAMP, merchantId: mockMerchantId },
        mockUserId,
      );

      expect(result.alreadyScanned).toBe(true);
      expect(prisma.stamp.create).not.toHaveBeenCalled();
    });
  });

  describe('resolveStampCooldownMs', () => {
    it('should default to 30 minutes when unset or invalid', () => {
      expect(resolveStampCooldownMs(undefined)).toBe(30 * 60 * 1000);
      expect(resolveStampCooldownMs('')).toBe(30 * 60 * 1000);
      expect(resolveStampCooldownMs('abc')).toBe(30 * 60 * 1000);
      expect(resolveStampCooldownMs('-5')).toBe(30 * 60 * 1000);
    });

    it('should honor STAMP_COOLDOWN_MINUTES for local testing', () => {
      expect(resolveStampCooldownMs('1')).toBe(60 * 1000);
      expect(resolveStampCooldownMs('0')).toBe(0);
    });
  });

  it('should successfully add a stamp with frozen expiresAt and callerUserId audit', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
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
    expect(result.method).toBe(ScanMethod.QR);
    expect(result.customer?.rut).toBe('12.***.*78-5');
    expect(passesService.notifyPassUpdate).toHaveBeenCalledWith(mockPassId);

    expect(scanCreateSpy).toHaveBeenCalledWith({
      data: {
        passId: mockPassId,
        merchantId: mockMerchantId,
        type: ScanType.STAMP_ADDED,
        createdByUserId: mockUserId,
        method: ScanMethod.QR,
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
    const promoTarget3 = {
      ...mockPromotion,
      targetStamps: 3,
    };
    vi.spyOn(prisma.promotion, 'findMany').mockResolvedValue([promoTarget3 as any]);
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
    // El saldo es único del pase: la búsqueda FIFO no filtra por promoción
    const fifoWhere = vi.mocked(prisma.stamp.findMany).mock.calls[0][0]!.where!;
    expect(fifoWhere).not.toHaveProperty('AND');
    expect(fifoWhere).not.toHaveProperty('promotionId');
    // FIFO de verdad: se piden los sellos vigentes ordenados del más antiguo al más nuevo.
    // Si alguien cambia el orden o quita el filtro de vencidos, esto falla.
    expect(prisma.stamp.findMany).toHaveBeenCalledWith({
      where: {
        passId: mockPassId,
        consumedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
      },
      orderBy: { earnedAt: 'asc' },
    });
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
    const promoTarget3 = {
      ...mockPromotion,
      targetStamps: 3,
    };
    vi.spyOn(prisma.promotion, 'findMany').mockResolvedValue([promoTarget3 as any]);
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
    vi.spyOn(prisma.promotion, 'findMany').mockResolvedValue([{ ...mockPromotion, targetStamps: 5 }] as any);
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

  describe('several active promotions share one stamp balance', () => {
    const promoSmall = { ...mockPromotion, id: 'promo-small', name: 'Café', rewardName: 'Café gratis', targetStamps: 3, createdAt: new Date('2026-01-01') };
    const promoBig = { ...mockPromotion, id: 'promo-big', name: 'Almuerzo', rewardName: 'Almuerzo gratis', targetStamps: 8, createdAt: new Date('2026-02-01') };

    beforeEach(() => {
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
      // Orden del backend: más reciente primero. La de referencia es promoBig.
      vi.spyOn(prisma.promotion, 'findMany').mockResolvedValue([promoBig, promoSmall] as any);
    });

    it('should add a stamp without asking which promotion it belongs to', async () => {
      vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'scan-new' } as any);
      const stampCreateSpy = vi.spyOn(prisma.stamp, 'create').mockResolvedValue({ id: 'stamp-new' } as any);
      vi.spyOn(prisma.stamp, 'count').mockResolvedValue(4);
      vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

      const result = await service.processScan(
        { passToken: mockToken, action: ScanActionType.STAMP, merchantId: mockMerchantId },
        mockUserId,
      );

      // El sello es saldo del pase: no se atribuye a ninguna promoción
      expect(stampCreateSpy.mock.calls[0][0].data).not.toHaveProperty('promotionId');
      expect(result.activeStamps).toBe(4);
      // Referencia = la promoción activa más reciente
      expect(result.targetStamps).toBe(8);
      expect(result.rewardName).toBe('Almuerzo gratis');
      // Con 4 sellos alcanza para el café (3) pero no para el almuerzo (8)
      expect(result.rewardUnlocked).toBe(true);
      expect(result.availablePromotions).toEqual([
        { id: 'promo-big', name: 'Almuerzo', rewardName: 'Almuerzo gratis', targetStamps: 8, canRedeem: false },
        { id: 'promo-small', name: 'Café', rewardName: 'Café gratis', targetStamps: 3, canRedeem: true },
      ]);
    });

    it('should redeem the promotion the customer chose, consuming only its target from the shared balance', async () => {
      vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null);
      const mockStamps = [1, 2, 3, 4].map((n) => ({ id: `stamp-${n}`, earnedAt: new Date(`2026-01-0${n}T00:00:00Z`) }));
      vi.spyOn(prisma.stamp, 'findMany').mockResolvedValue(mockStamps as any);
      const scanCreateSpy = vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'redeem-small' } as any);
      const updateManySpy = vi.spyOn(prisma.stamp, 'updateMany').mockResolvedValue({ count: 3 } as any);
      vi.spyOn(prisma.stamp, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

      const result = await service.processScan(
        { passToken: mockToken, action: ScanActionType.REDEEM, merchantId: mockMerchantId, promotionId: 'promo-small' },
        mockUserId,
      );

      // Queda registrado QUÉ promoción se canjeó
      expect(scanCreateSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: ScanType.REWARD_REDEEMED, promotionId: 'promo-small' }),
      });
      // FIFO: los 3 más antiguos, sin importar la promoción
      expect(updateManySpy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['stamp-1', 'stamp-2', 'stamp-3'] }, consumedAt: null } }),
      );
      expect(result.rewardName).toBe('Café gratis');
      expect(result.consumedStampsCount).toBe(3);
      expect(result.activeStamps).toBe(1);
      expect(result.rewardUnlocked).toBe(false);
    });

    it('should reject redeeming a promotion the balance does not cover', async () => {
      vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.stamp, 'findMany').mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] as any);

      await expect(
        service.processScan(
          { passToken: mockToken, action: ScanActionType.REDEEM, merchantId: mockMerchantId, promotionId: 'promo-big' },
          mockUserId,
        ),
      ).rejects.toThrow('Sellos activos insuficientes para canjear "Almuerzo". Tiene 4, requiere 8');
      expect(prisma.scan.create).not.toHaveBeenCalled();
    });

    it('should require promotionId on REDEEM when several promotions are active', async () => {
      await expect(
        service.processScan(
          { passToken: mockToken, action: ScanActionType.REDEEM, merchantId: mockMerchantId },
          mockUserId,
        ),
      ).rejects.toThrow('El comercio tiene varias promociones activas: indique en promotionId cuál eligió canjear el cliente.');
    });
  });

  it('should throw BadRequestException on REDEEM if the chosen promotionId is not an active promotion', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);

    await expect(
      service.processScan(
        {
          passToken: mockToken,
          action: ScanActionType.REDEEM,
          merchantId: mockMerchantId,
          promotionId: 'non-existent-promo',
        },
        mockUserId,
      ),
    ).rejects.toThrow('La promoción especificada no existe o no está activa en este comercio');
  });

  describe('manual lookup by customer (camera fallback)', () => {
    const stampTheNextOne = () => {
      vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'scan-manual-1' } as any);
      vi.spyOn(prisma.stamp, 'create').mockResolvedValue({ id: 'stamp-manual-1' } as any);
      vi.spyOn(prisma.stamp, 'count').mockResolvedValue(2);
      vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);
    };

    it('should find the pass by normalized RUT scoped to the merchant and add a stamp', async () => {
      const findFirstSpy = vi.spyOn(prisma.pass, 'findFirst').mockResolvedValue(mockPass as any);
      stampTheNextOne();

      const result = await service.processScan(
        {
          customer: { rut: '12.345.678-5' },
          action: ScanActionType.STAMP,
          merchantId: mockMerchantId,
        },
        mockUserId,
      );

      expect(findFirstSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { merchantId: mockMerchantId, customer: { rut: '12345678-5' } },
        }),
      );
      expect(prisma.pass.findUnique).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.activeStamps).toBe(2);
    });

    it('should find the pass by normalized phone', async () => {
      const findFirstSpy = vi.spyOn(prisma.pass, 'findFirst').mockResolvedValue(mockPass as any);
      stampTheNextOne();

      await service.processScan(
        {
          customer: { phone: '9 1234 5678' },
          action: ScanActionType.STAMP,
          merchantId: mockMerchantId,
        },
        mockUserId,
      );

      expect(findFirstSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { merchantId: mockMerchantId, customer: { phone: '+56912345678' } },
        }),
      );
    });

    it('should throw NotFoundException if the customer has no pass in this merchant', async () => {
      vi.spyOn(prisma.pass, 'findFirst').mockResolvedValue(null);

      await expect(
        service.processScan(
          {
            customer: { rut: '12.345.678-5' },
            action: ScanActionType.STAMP,
            merchantId: mockMerchantId,
          },
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for an invalid RUT without querying passes', async () => {
      await expect(
        service.processScan(
          {
            customer: { rut: '12.345.678-9' },
            action: ScanActionType.STAMP,
            merchantId: mockMerchantId,
          },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.pass.findFirst).not.toHaveBeenCalled();
    });

    it('should check membership before looking up the customer', async () => {
      vi.spyOn(prisma.merchantUser, 'findUnique').mockResolvedValue(null);

      await expect(
        service.processScan(
          {
            customer: { rut: '12.345.678-5' },
            action: ScanActionType.STAMP,
            merchantId: mockMerchantId,
          },
          'unauthorized-user-id',
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.pass.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('review fixes (PR #11)', () => {
    it('queries the cooldown against the last STAMP_ADDED of this pass in this merchant', async () => {
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
      vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'scan-q' } as any);
      vi.spyOn(prisma.stamp, 'create').mockResolvedValue({ id: 'stamp-q' } as any);
      vi.spyOn(prisma.stamp, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

      await service.processScan(
        { passToken: mockToken, action: ScanActionType.STAMP, merchantId: mockMerchantId },
        mockUserId,
      );

      expect(prisma.scan.findFirst).toHaveBeenCalledWith({
        where: { passId: mockPassId, merchantId: mockMerchantId, type: ScanType.STAMP_ADDED },
        orderBy: { createdAt: 'desc' },
      });
      // Saldo: vigentes y no consumidos, sin filtrar por promoción
      expect(prisma.stamp.count).toHaveBeenCalledWith({
        where: {
          passId: mockPassId,
          consumedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
        },
      });
    });

    it('ignores promotionId on STAMP: the stamp goes to the pass balance', async () => {
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
      vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'scan-p' } as any);
      const stampCreate = vi.spyOn(prisma.stamp, 'create').mockResolvedValue({ id: 'stamp-p' } as any);
      vi.spyOn(prisma.stamp, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

      await service.processScan(
        {
          passToken: mockToken,
          action: ScanActionType.STAMP,
          merchantId: mockMerchantId,
          promotionId: 'd3b07384-d113-4011-8e8e-d9006fa70bc6',
        },
        mockUserId,
      );

      expect(stampCreate.mock.calls[0][0].data).not.toHaveProperty('promotionId');
    });

    it('does not block anything when STAMP_COOLDOWN_MINUTES=0', async () => {
      const noCooldown = new ScanService(prisma, passesService, configWithCooldown('0'), new ManualLookupLimiter());
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
      vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue({
        id: 'scan-just-now',
        type: ScanType.STAMP_ADDED,
        createdAt: new Date(Date.now() + 1000), // incluso "en el futuro" por desfase de reloj
      } as any);
      vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'scan-0' } as any);
      vi.spyOn(prisma.stamp, 'create').mockResolvedValue({ id: 'stamp-0' } as any);
      vi.spyOn(prisma.stamp, 'count').mockResolvedValue(2);
      vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

      const result = await noCooldown.processScan(
        { passToken: mockToken, action: ScanActionType.STAMP, merchantId: mockMerchantId },
        mockUserId,
      );

      expect(result.alreadyScanned).toBe(false);
      expect(prisma.stamp.create).toHaveBeenCalledTimes(1);
    });

    it('never exposes the internal customer id to the cashier', async () => {
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
      vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'scan-m' } as any);
      vi.spyOn(prisma.stamp, 'create').mockResolvedValue({ id: 'stamp-m' } as any);
      vi.spyOn(prisma.stamp, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

      const result = await service.processScan(
        { passToken: mockToken, action: ScanActionType.STAMP, merchantId: mockMerchantId },
        mockUserId,
      );

      expect(result.customer).toEqual({ rut: '12.***.*78-5', phone: expect.any(String) });
      expect(result.customer).not.toHaveProperty('id');
    });

    describe('REDEEM duplicate window is per promotion', () => {
      const promoA = { ...mockPromotion, id: 'promo-a', name: 'A', rewardName: 'Premio A', targetStamps: 5 };
      const promoB = { ...mockPromotion, id: 'promo-b', name: 'B', rewardName: 'Premio B', targetStamps: 5 };

      beforeEach(() => {
        vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
        vi.spyOn(prisma.promotion, 'findMany').mockResolvedValue([promoB, promoA] as any);
        // En la BD hay un canje de A hace 10 s. findFirst respeta el where que recibe.
        vi.spyOn(prisma.scan, 'findFirst').mockImplementation((async ({ where }: any) =>
          where.type === ScanType.REWARD_REDEEMED && where.promotionId === 'promo-a'
            ? { id: 'redeem-a', promotionId: 'promo-a', createdAt: new Date(Date.now() - 10_000) }
            : null) as any);
        vi.spyOn(prisma.stamp, 'count').mockResolvedValue(10);
        vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);
      });

      it('redeems B right after A (it is not a duplicate) and consumes its stamps', async () => {
        const stamps = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}` }));
        vi.spyOn(prisma.stamp, 'findMany').mockResolvedValue(stamps as any);
        vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'redeem-b' } as any);
        const updateMany = vi.spyOn(prisma.stamp, 'updateMany').mockResolvedValue({ count: 5 } as any);

        const result = await service.processScan(
          { passToken: mockToken, action: ScanActionType.REDEEM, merchantId: mockMerchantId, promotionId: 'promo-b' },
          mockUserId,
        );

        expect(result.alreadyScanned).toBe(false);
        expect(result.rewardName).toBe('Premio B');
        expect(updateMany).toHaveBeenCalledTimes(1);
      });

      it('treats a second tap on the SAME promotion as a duplicate without consuming stamps', async () => {
        const updateMany = vi.spyOn(prisma.stamp, 'updateMany');

        const result = await service.processScan(
          { passToken: mockToken, action: ScanActionType.REDEEM, merchantId: mockMerchantId, promotionId: 'promo-a' },
          mockUserId,
        );

        expect(result.alreadyScanned).toBe(true);
        expect(result.scanId).toBe('redeem-a');
        expect(result.rewardName).toBe('Premio A');
        expect(updateMany).not.toHaveBeenCalled();
      });
    });

    it('redeems through manual entry by phone', async () => {
      vi.spyOn(prisma.pass, 'findFirst').mockResolvedValue(mockPass as any);
      vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.stamp, 'findMany').mockResolvedValue([1, 2, 3, 4, 5].map((n) => ({ id: `s${n}` })) as any);
      vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'redeem-phone' } as any);
      vi.spyOn(prisma.stamp, 'updateMany').mockResolvedValue({ count: 5 } as any);
      vi.spyOn(prisma.stamp, 'count').mockResolvedValue(0);
      vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

      const result = await service.processScan(
        { customer: { phone: '+56912345678' }, action: ScanActionType.REDEEM, merchantId: mockMerchantId },
        mockUserId,
      );

      expect(prisma.pass.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { merchantId: mockMerchantId, customer: { phone: '+56912345678' } } }),
      );
      expect(result.consumedStampsCount).toBe(5);
    });

    it('rejects an invalid phone in manual entry without querying passes', async () => {
      await expect(
        service.processScan(
          { customer: { phone: '1234' }, action: ScanActionType.STAMP, merchantId: mockMerchantId },
          mockUserId,
        ),
      ).rejects.toThrow('El teléfono ingresado no es un celular chileno válido');
      expect(prisma.pass.findFirst).not.toHaveBeenCalled();
    });

    it('rate-limits manual lookups per user but never QR scans', async () => {
      const limited = new ScanService(prisma, passesService, configWithCooldown('30'), new ManualLookupLimiter(2, 60_000));
      vi.spyOn(prisma.pass, 'findFirst').mockResolvedValue(null);
      const manual = { customer: { rut: '12.345.678-5' }, action: ScanActionType.STAMP, merchantId: mockMerchantId };

      await expect(limited.processScan(manual, mockUserId)).rejects.toThrow(NotFoundException);
      await expect(limited.processScan(manual, mockUserId)).rejects.toThrow(NotFoundException);
      await expect(limited.processScan(manual, mockUserId)).rejects.toThrow('Demasiadas búsquedas manuales');
      expect(prisma.pass.findFirst).toHaveBeenCalledTimes(2);

      // Otro usuario tiene su propio cupo, y el QR no consume cupo
      await expect(limited.processScan(manual, 'otro-usuario')).rejects.toThrow(NotFoundException);
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(null);
      await expect(
        limited.processScan({ passToken: mockToken, action: ScanActionType.STAMP, merchantId: mockMerchantId }, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('audit scan method (QR vs MANUAL)', () => {
    beforeEach(() => {
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(mockPass as any);
      vi.spyOn(prisma.pass, 'findFirst').mockResolvedValue(mockPass as any);
      vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.scan, 'create').mockResolvedValue({ id: 'scan-audit-1' } as any);
      vi.spyOn(prisma.stamp, 'create').mockResolvedValue({ id: 'stamp-audit-1' } as any);
      vi.spyOn(prisma.stamp, 'count').mockResolvedValue(1);
      vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);
    });

    it('records method QR when passToken is provided (STAMP)', async () => {
      const scanCreateSpy = vi.spyOn(prisma.scan, 'create');

      const result = await service.processScan(
        {
          passToken: mockToken,
          action: ScanActionType.STAMP,
          merchantId: mockMerchantId,
        },
        mockUserId,
      );

      expect(scanCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            method: ScanMethod.QR,
          }),
        }),
      );
      expect(result.method).toBe(ScanMethod.QR);
    });

    it('records method QR when passToken is provided (REDEEM)', async () => {
      const stamps = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}` }));
      vi.spyOn(prisma.stamp, 'findMany').mockResolvedValue(stamps as any);
      vi.spyOn(prisma.stamp, 'updateMany').mockResolvedValue({ count: 5 } as any);
      const scanCreateSpy = vi.spyOn(prisma.scan, 'create');

      const result = await service.processScan(
        {
          passToken: mockToken,
          action: ScanActionType.REDEEM,
          merchantId: mockMerchantId,
        },
        mockUserId,
      );

      expect(scanCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            method: ScanMethod.QR,
          }),
        }),
      );
      expect(result.method).toBe(ScanMethod.QR);
    });

    it('records method MANUAL when searching manually with RUT (STAMP)', async () => {
      const scanCreateSpy = vi.spyOn(prisma.scan, 'create');

      const result = await service.processScan(
        {
          customer: { rut: '12.345.678-5' },
          action: ScanActionType.STAMP,
          merchantId: mockMerchantId,
        },
        mockUserId,
      );

      expect(scanCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            method: ScanMethod.MANUAL,
          }),
        }),
      );
      expect(result.method).toBe(ScanMethod.MANUAL);
    });

    it('records method MANUAL when searching manually with phone (STAMP)', async () => {
      const scanCreateSpy = vi.spyOn(prisma.scan, 'create');

      const result = await service.processScan(
        {
          customer: { phone: '+56912345678' },
          action: ScanActionType.STAMP,
          merchantId: mockMerchantId,
        },
        mockUserId,
      );

      expect(scanCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            method: ScanMethod.MANUAL,
          }),
        }),
      );
      expect(result.method).toBe(ScanMethod.MANUAL);
    });

    it('records method MANUAL when searching manually with phone (REDEEM)', async () => {
      const stamps = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}` }));
      vi.spyOn(prisma.stamp, 'findMany').mockResolvedValue(stamps as any);
      vi.spyOn(prisma.stamp, 'updateMany').mockResolvedValue({ count: 5 } as any);
      const scanCreateSpy = vi.spyOn(prisma.scan, 'create');

      const result = await service.processScan(
        {
          customer: { phone: '+56912345678' },
          action: ScanActionType.REDEEM,
          merchantId: mockMerchantId,
        },
        mockUserId,
      );

      expect(scanCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            method: ScanMethod.MANUAL,
          }),
        }),
      );
      expect(result.method).toBe(ScanMethod.MANUAL);
    });

    it('returns method on alreadyScanned results', async () => {
      vi.spyOn(prisma.scan, 'findFirst').mockResolvedValue({
        id: 'scan-prev-1',
        passId: mockPassId,
        merchantId: mockMerchantId,
        type: ScanType.STAMP_ADDED,
        method: ScanMethod.QR,
        createdAt: new Date(),
      } as any);

      const result = await service.processScan(
        {
          passToken: mockToken,
          action: ScanActionType.STAMP,
          merchantId: mockMerchantId,
        },
        mockUserId,
      );

      expect(result.alreadyScanned).toBe(true);
      expect(result.method).toBe(ScanMethod.QR);
    });
  });

  describe('ScanActionDto validation', () => {
    const merchantId = 'd3b07384-d113-4011-8e8e-d9006fa70bc6';
    const errorsOf = async (body: object) =>
      (await validate(plainToInstance(ScanActionDto, body))).map((e) => e.property);

    it('accepts a QR scan (passToken) or a manual entry (customer)', async () => {
      expect(await errorsOf({ merchantId, action: 'STAMP', passToken: 'abc' })).toEqual([]);
      expect(await errorsOf({ merchantId, action: 'STAMP', customer: { rut: '12.345.678-5' } })).toEqual([]);
      expect(await errorsOf({ merchantId, action: 'STAMP', customer: { phone: '+56912345678' } })).toEqual([]);
    });

    it('requires passToken when there is no customer', async () => {
      expect(await errorsOf({ merchantId, action: 'STAMP' })).toContain('passToken');
    });

    it('rejects an empty customer object', async () => {
      expect(await errorsOf({ merchantId, action: 'STAMP', customer: {} })).toContain('customer');
    });
  });
});
