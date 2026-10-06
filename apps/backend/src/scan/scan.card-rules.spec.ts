import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ScanMethod, ScanType } from '@prisma/client';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PassesService } from '../passes/passes.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ScanActionType } from './dto/scan-action.dto.js';
import { ManualLookupLimiter } from './manual-lookup-limiter.js';
import type { ReceiptStorageService } from './receipt-storage.service.js';
import { POINTS_DUPLICATE_WINDOW_MS, ScanService } from './scan.service.js';
import { ScanValidationTokens } from './validation-token.js';

const merchantId = 'a0000000-0000-4000-8000-000000000001';
const brandId = merchantId;
const programId = 'b0000000-0000-4000-8000-000000000001';
const passId = 'p0000000-0000-4000-8000-000000000001';
const userId = 'u0000000-0000-4000-8000-000000000001';

const config = {
  get: (key: string) => ({ STAMP_COOLDOWN_MINUTES: '30', SCAN_VALIDATION_SECRET: 'test-secret' })[key],
} as unknown as ConfigService;


async function receipt() {
  const buffer = await sharp({
    create: { width: 4, height: 4, channels: 3, background: '#ffffff' },
  })
    .png()
    .toBuffer();
  return { originalname: 'boleta.png', mimetype: 'image/png', size: buffer.length, buffer };
}

describe('ScanService: reglas de la tarjeta', () => {
  let prisma: PrismaService;
  let service: ScanService;
  let role: 'OWNER' | 'STAFF';
  let program: Record<string, unknown>;
  let latestStamp: { id: string; createdAt: Date; method: ScanMethod; type: ScanType } | null;
  let passCreatedAt: Date;
  let promotion: { id: string; name: string; targetStamps: number; rewardName: string; isActive: boolean };

  beforeEach(() => {
    promotion = { id: 'promo-1', name: 'Postre', targetStamps: 50, rewardName: 'Postre', isActive: true };
    role = 'STAFF';
    latestStamp = null;
    passCreatedAt = new Date('2026-01-01T12:00:00Z');
    program = { id: programId, brandId, type: 'STAMPS', isActive: true, stampValidityDays: null, dailyStampLimit: true, stampsEnabled: true, pointsEnabled: false, allowMultipleRedemptionsPerVisit: false };
    prisma = {
      merchant: {
        findUnique: vi.fn().mockResolvedValue({
          id: merchantId,
          brandId,
          name: 'Local',
          isActive: true,
          brand: { name: 'Marca', status: 'ACTIVE' },
        }),
      },
      brandMember: {
        findUnique: vi.fn(async () => ({ userId, brandId, role, merchantId: role === 'STAFF' ? merchantId : null })),
      },
      brand: { findUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE', pesosPerPoint: 1000 }) },
      loyaltyProgram: { findFirst: vi.fn(async () => program) },
      pass: {
        findUnique: vi.fn(async () => ({
          id: passId,
          passToken: 'qr-token',
          programId,
          merchantId,
          createdAt: passCreatedAt,
          customer: { id: 'c-1', name: 'María', rut: null, phone: '+56912345678', email: null },
        })),
      },
      promotion: { findMany: vi.fn(async () => [promotion]) },
      scan: {
        findFirst: vi.fn(async () => latestStamp),
        create: vi.fn().mockResolvedValue({ id: 'scan-1' }),
      },
      stamp: {
        count: vi.fn().mockResolvedValue(12),
        findFirst: vi.fn().mockResolvedValue(null),
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      scanReceipt: { create: vi.fn() },
      auditLog: { create: vi.fn() },
      $queryRaw: vi.fn().mockResolvedValue([]),
      $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
    } as unknown as PrismaService;

    service = new ScanService(
      prisma,
      { notifyPassUpdate: vi.fn().mockResolvedValue(undefined) } as unknown as PassesService,
      config,
      new ManualLookupLimiter(),
      {
        uploadThen: vi.fn((_upload: unknown, persist: () => Promise<unknown>) => persist()),
        remove: vi.fn(),
      } as unknown as ReceiptStorageService,
      new ScanValidationTokens(config),
    );
  });

  afterEach(() => vi.useRealTimers());

  const stamp = (extra: Record<string, unknown> = {}, file?: Awaited<ReturnType<typeof receipt>>) =>
    service.processScan(
      { passToken: 'qr-token', action: ScanActionType.STAMP, merchantId, ...extra },
      userId,
      file,
    );

  const createdRows = () => vi.mocked(prisma.stamp.createMany).mock.calls[0]?.[0]?.data as unknown[];

  describe('puntos', () => {
    beforeEach(() => {
      program.type = 'POINTS';
      program.stampsEnabled = false;
      program.pointsEnabled = true;
    });

    it('tells the cashier the amount and the receipt are required', async () => {
      const validation = await service.validate({ passToken: 'qr-token', merchantId }, userId);
      expect(validation).toMatchObject({
        cardType: 'POINTS',
        pesosPerPoint: 1000,
        amountRequired: true,
        receiptRequired: true,
        maxStampsPerLoad: 1,
      });
    });

    it('requires the purchase amount', async () => {
      await expect(stamp({}, await receipt())).rejects.toThrow('Ingresa el monto de la compra');
    });

    it('requires the receipt photo from the STAFF', async () => {
      await expect(stamp({ purchaseAmount: 12_500 })).rejects.toThrow('Adjunta la foto de la boleta');
      expect(prisma.scan.create).not.toHaveBeenCalled();
    });

    it('gives one point per 1.000 pesos and records the amount', async () => {
      const result = await stamp({ purchaseAmount: 12_500 }, await receipt());

      expect(result.pointsAdded).toBe(12);
      expect(createdRows()).toHaveLength(12);
      expect(prisma.scan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ pointsEarned: 12, purchaseAmount: 12_500 }),
      });
      expect(result.message).toMatch(/12 puntos agregados/);
    });

    it('rejects an amount below one point', async () => {
      await expect(stamp({ purchaseAmount: 900 }, await receipt())).rejects.toThrow(
        'El monto no alcanza para un punto (1 punto cada $1.000)',
      );
    });

    it('lets the OWNER add points without the receipt', async () => {
      role = 'OWNER';
      const result = await stamp({ purchaseAmount: 3_000 });
      expect(result.pointsAdded).toBe(3);
    });

    it('only blocks a repeated purchase for a couple of minutes', async () => {
      latestStamp = {
        id: 'prev',
        createdAt: new Date(Date.now() - POINTS_DUPLICATE_WINDOW_MS + 30_000),
        method: ScanMethod.QR,
        type: ScanType.STAMP_ADDED,
      };
      const blocked = await stamp({ purchaseAmount: 5_000 }, await receipt());
      expect(blocked.alreadyScanned).toBe(true);
      expect(blocked.message).toMatch(/parece repetida/);

      latestStamp.createdAt = new Date(Date.now() - POINTS_DUPLICATE_WINDOW_MS - 1000);
      const second = await stamp({ purchaseAmount: 5_000 }, await receipt());
      expect(second.alreadyScanned).toBe(false);
    });
  });

  describe('límite de un sello por día', () => {
    beforeEach(() => {
      program = { ...program, type: 'STAMPS', dailyStampLimit: true };
      promotion.targetStamps = 10;
    });

    it('blocks a second stamp the same Chilean day, even hours later', async () => {
      vi.useFakeTimers({ now: new Date('2026-10-03T23:00:00Z'), toFake: ['Date'] });
      latestStamp = {
        id: 'prev',
        createdAt: new Date('2026-10-03T13:00:00Z'),
        method: ScanMethod.QR,
        type: ScanType.STAMP_ADDED,
      };
      const validation = await service.validate({ passToken: 'qr-token', merchantId }, userId);
      expect(validation.canStamp).toBe(false);
      expect(validation.nextStampAvailableAt?.toISOString()).toBe('2026-10-04T03:00:00.000Z');

      const result = await stamp();
      expect(result.alreadyScanned).toBe(true);
      expect(result.message).toMatch(/límite diario de sellos/);
    });

    it('allows the next stamp after Chilean midnight', async () => {
      vi.useFakeTimers({ now: new Date('2026-10-04T03:30:00Z'), toFake: ['Date'] });
      latestStamp = {
        id: 'prev',
        createdAt: new Date('2026-10-03T23:00:00Z'),
        method: ScanMethod.QR,
        type: ScanType.STAMP_ADDED,
      };
      const result = await stamp();
      expect(result.alreadyScanned).toBe(false);
    });

    it('lets the OWNER add another stamp the same day with a reason', async () => {
      role = 'OWNER';
      latestStamp = { id: 'prev', createdAt: new Date(), method: ScanMethod.QR, type: ScanType.STAMP_ADDED };
      const result = await stamp({ reason: 'Segunda compra del día' });
      expect(result.alreadyScanned).toBe(false);
    });
  });

  describe('vigencia de la tarjeta', () => {
    it('rejects a card that expired after its fixed term', async () => {
      program = { ...program, cardValidity: 'AFTER_JOIN', cardValidityDays: 30 };
      await expect(service.validate({ passToken: 'qr-token', merchantId }, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('accepts a card still within its term', async () => {
      passCreatedAt = new Date();
      program = { ...program, cardValidity: 'AFTER_JOIN', cardValidityDays: 30 };
      await expect(service.validate({ passToken: 'qr-token', merchantId }, userId)).resolves.toBeDefined();
    });
  });
});
