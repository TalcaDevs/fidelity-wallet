import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { ScanMethod, ScanType } from '@prisma/client';
import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PassesService } from '../passes/passes.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ScanActionType } from './dto/scan-action.dto.js';
import { ManualLookupLimiter } from './manual-lookup-limiter.js';
import type { ReceiptStorageService } from './receipt-storage.service.js';
import { ScanService, resolveOwnerMaxStamps } from './scan.service.js';
import { ScanValidationTokens, VALIDATION_TOKEN_TTL_MS } from './validation-token.js';

const merchantId = 'a0000000-0000-4000-8000-000000000001';
const brandId = merchantId;
const programId = 'b0000000-0000-4000-8000-000000000001';
const passId = 'p0000000-0000-4000-8000-000000000001';
const userId = 'u0000000-0000-4000-8000-000000000001';

const config = (values: Record<string, string> = {}) =>
  ({
    get: (key: string) =>
      ({ STAMP_COOLDOWN_MINUTES: '30', SCAN_VALIDATION_SECRET: 'test-secret', ...values })[key],
  }) as unknown as ConfigService;

const pass = {
  id: passId,
  passToken: 'qr-token',
  merchantId,
  brandId,
  programId,
  customerId: 'c0000000-0000-4000-8000-000000000001',
  customer: {
    id: 'c0000000-0000-4000-8000-000000000001',
    rut: '12345678-5',
    phone: '+56912345678',
    email: 'maria.perez@gmail.com',
    name: 'María José Pérez',
  },
};

const promotion = {
  id: 'promo-1',
  name: 'Café',
  targetStamps: 5,
  rewardName: 'Café gratis',
  isActive: true,
  createdAt: new Date(),
};

describe('ScanService: validación en caja', () => {
  let prisma: PrismaService;
  let receipts: { uploadThen: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  let limiter: ManualLookupLimiter;
  let tokens: ScanValidationTokens;
  let service: ScanService;
  let role: 'OWNER' | 'STAFF';
  let latestStamp: { id: string; createdAt: Date; method: ScanMethod; type: ScanType } | null;

  const build = (values?: Record<string, string>) =>
    new ScanService(
      prisma,
      {
        notifyPassUpdate: vi.fn().mockResolvedValue(undefined),
        enqueuePassUpdate: vi.fn().mockResolvedValue(undefined),
      } as unknown as PassesService,
      config(values),
      limiter,
      receipts as unknown as ReceiptStorageService,
      tokens,
    );

  beforeEach(() => {
    role = 'STAFF';
    latestStamp = null;
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
        findUnique: vi.fn(async () => ({
          userId,
          brandId,
          role,
          merchantId: role === 'STAFF' ? merchantId : null,
        })),
      },
      loyaltyProgram: {
        findFirst: vi.fn().mockResolvedValue({
          id: programId,
          brandId,
          type: 'STAMPS',
          isActive: true,
          stampValidityDays: null,
          dailyStampLimit: false,
        }),
      },
      pass: {
        findUnique: vi.fn().mockResolvedValue(pass),
        findFirst: vi.fn().mockResolvedValue(pass),
      },
      promotion: { findMany: vi.fn().mockResolvedValue([promotion]) },
      scan: {
        findFirst: vi.fn(async () => latestStamp),
        create: vi.fn().mockResolvedValue({ id: 'scan-1' }),
      },
      stamp: {
        createMany: vi.fn(async function (this: { create: (args: unknown) => unknown }, { data }: { data: unknown[] }) {
          for (const row of data) await this.create({ data: row });
          return { count: data.length };
        }),
        count: vi.fn().mockResolvedValue(3),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'stamp-1' }),
      },
      scanReceipt: { create: vi.fn() },
      auditLog: { create: vi.fn() },
      brand: { findUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE' }) },
      $queryRaw: vi.fn().mockResolvedValue([]),
      $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
    } as unknown as PrismaService;
    receipts = {
      uploadThen: vi.fn((_upload: unknown, persist: () => Promise<unknown>) => persist()),
      remove: vi.fn(),
    };
    limiter = new ManualLookupLimiter(2, 60_000);
    tokens = new ScanValidationTokens(config());
    service = build();
  });

  const recentStamp = () => ({
    id: 'scan-prev',
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
    method: ScanMethod.QR,
    type: ScanType.STAMP_ADDED,
  });

  describe('validate', () => {
    it('shows only the first name and adds nothing', async () => {
      const result = await service.validate({ passToken: 'qr-token', merchantId }, userId);

      expect(result.customer).toEqual({
        firstName: 'María',
        rut: '12.***.*78-5',
        phone: '+56 9 **** 5678',
        email: 'm***@gmail.com',
      });
      expect(result.method).toBe(ScanMethod.QR);
      expect(result.activeStamps).toBe(3);
      expect(result.canStamp).toBe(true);
      expect(result.maxStampsPerLoad).toBe(1);
      expect(prisma.scan.create).not.toHaveBeenCalled();
      expect(prisma.stamp.create).not.toHaveBeenCalled();
    });

    it('blocks the STAFF during the cooldown but lets the OWNER stamp with a reason', async () => {
      latestStamp = recentStamp();

      const staff = await service.validate({ passToken: 'qr-token', merchantId }, userId);
      expect(staff.canStamp).toBe(false);
      expect(staff.nextStampAvailableAt).toBeInstanceOf(Date);

      role = 'OWNER';
      const owner = await service.validate({ passToken: 'qr-token', merchantId }, userId);
      expect(owner.canStamp).toBe(true);
      expect(owner.reasonRequired).toBe(true);
      expect(owner.maxStampsPerLoad).toBe(10);
    });

    it('finds the customer by email in manual entry and counts it against the limit', async () => {
      const result = await service.validate(
        { customer: { email: ' Maria.Perez@Gmail.com ' }, merchantId },
        userId,
      );

      expect(result.method).toBe(ScanMethod.MANUAL);
      expect(prisma.pass.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { programId, customer: { email: 'maria.perez@gmail.com' } },
        }),
      );
      await service.validate({ customer: { email: 'maria.perez@gmail.com' }, merchantId }, userId);
      await expect(
        service.validate({ customer: { email: 'maria.perez@gmail.com' }, merchantId }, userId),
      ).rejects.toThrow('Demasiadas búsquedas manuales');
    });
  });

  describe('STAMP with the validation token', () => {
    const tokenFor = async (customer = true) =>
      (
        await service.validate(
          customer ? { customer: { rut: '12.345.678-5' }, merchantId } : { passToken: 'qr-token', merchantId },
          userId,
        )
      ).validationToken;

    it('keeps the method of the validation and does not spend another manual lookup', async () => {
      const validationToken = await tokenFor();
      await tokenFor();

      const result = await service.processScan(
        { validationToken, action: ScanActionType.STAMP, merchantId },
        userId,
      );

      expect(result.alreadyScanned).toBe(false);
      expect(prisma.scan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ method: ScanMethod.MANUAL, stampCount: 1 }),
      });
    });

    it('rejects a token issued to another user', async () => {
      const validationToken = await tokenFor(false);

      await expect(
        service.processScan(
          { validationToken, action: ScanActionType.STAMP, merchantId },
          'u0000000-0000-4000-8000-000000000002',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('stores the purchase amount and the note', async () => {
      const validationToken = await tokenFor(false);

      await service.processScan(
        { validationToken, action: ScanActionType.STAMP, merchantId, purchaseAmount: 12500, note: 'Mesa 4' },
        userId,
      );

      expect(prisma.scan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ purchaseAmount: 12500, note: 'Mesa 4' }),
      });
    });
  });

  describe('stamp count', () => {
    it('does not let the STAFF load several stamps', async () => {
      await expect(
        service.processScan(
          { passToken: 'qr-token', action: ScanActionType.STAMP, merchantId, stampCount: 2, reason: 'Cliente frecuente' },
          userId,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.scan.create).not.toHaveBeenCalled();
    });

    it('asks the OWNER for a reason and caps the load', async () => {
      role = 'OWNER';

      await expect(
        service.processScan(
          { passToken: 'qr-token', action: ScanActionType.STAMP, merchantId, stampCount: 3 },
          userId,
        ),
      ).rejects.toThrow('Indica el motivo');

      await expect(
        service.processScan(
          { passToken: 'qr-token', action: ScanActionType.STAMP, merchantId, stampCount: 11, reason: 'Compensación' },
          userId,
        ),
      ).rejects.toThrow('hasta 10 sellos');
    });

    it('loads several stamps for the OWNER and leaves the reason in the audit log', async () => {
      role = 'OWNER';

      const result = await service.processScan(
        { passToken: 'qr-token', action: ScanActionType.STAMP, merchantId, stampCount: 4, reason: 'Compensación por reclamo' },
        userId,
      );

      expect(result.stampsAdded).toBe(4);
      expect(prisma.stamp.create).toHaveBeenCalledTimes(4);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorType: 'OWNER',
          action: 'pass.stamps_added',
          entityId: passId,
          reason: 'Compensación por reclamo',
        }),
      });
    });

    it('lets the OWNER skip the cooldown only with a reason', async () => {
      role = 'OWNER';
      latestStamp = recentStamp();

      const blocked = await service.processScan(
        { passToken: 'qr-token', action: ScanActionType.STAMP, merchantId },
        userId,
      );
      expect(blocked.alreadyScanned).toBe(true);

      const stamped = await service.processScan(
        { passToken: 'qr-token', action: ScanActionType.STAMP, merchantId, reason: 'Segunda compra' },
        userId,
      );
      expect(stamped.alreadyScanned).toBe(false);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ after: expect.objectContaining({ overridesCooldown: true }) }),
      });
    });

    it('honors OWNER_MAX_STAMPS_PER_LOAD', () => {
      expect(resolveOwnerMaxStamps(undefined)).toBe(10);
      expect(resolveOwnerMaxStamps('abc')).toBe(10);
      expect(resolveOwnerMaxStamps('0')).toBe(10);
      expect(resolveOwnerMaxStamps('25')).toBe(25);
    });
  });

  describe('receipt photo', () => {
    const png = () =>
      sharp({ create: { width: 4, height: 4, channels: 3, background: '#ffffff' } }).png().toBuffer();

    it('uploads the photo and links it to the scan', async () => {
      const buffer = await png();

      await service.processScan(
        { passToken: 'qr-token', action: ScanActionType.STAMP, merchantId },
        userId,
        { originalname: 'boleta.png', mimetype: 'image/png', size: buffer.length, buffer },
      );

      const [upload] = receipts.uploadThen.mock.calls[0] as [{ path: string; contentType: string }];
      expect(upload.path).toMatch(new RegExp(`^${brandId}/${passId}/[0-9a-f-]+\\.png$`));
      expect(upload.contentType).toBe('image/png');
      expect(prisma.scanReceipt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ scanId: 'scan-1', storagePath: upload.path, uploadedByUserId: userId }),
      });
      expect(receipts.remove).not.toHaveBeenCalled();
    });

    it('removes the upload when the cooldown blocks the stamp', async () => {
      latestStamp = recentStamp();
      const buffer = await png();

      const result = await service.processScan(
        { passToken: 'qr-token', action: ScanActionType.STAMP, merchantId },
        userId,
        { originalname: 'boleta.png', mimetype: 'image/png', size: buffer.length, buffer },
      );

      expect(result.alreadyScanned).toBe(true);
      expect(prisma.scanReceipt.create).not.toHaveBeenCalled();
      expect(receipts.remove).toHaveBeenCalledTimes(1);
    });

    it('rejects something that is not an image before touching the database', async () => {
      const buffer = Buffer.from('not an image');

      await expect(
        service.processScan(
          { passToken: 'qr-token', action: ScanActionType.STAMP, merchantId },
          userId,
          { originalname: 'boleta.png', mimetype: 'image/png', size: buffer.length, buffer },
        ),
      ).rejects.toThrow('La foto de la boleta debe ser una imagen PNG o JPG');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('addStampsFromPanel (ficha del cliente)', () => {
    const customerId = pass.customerId;
    const panel = (extra: object = {}) => ({ brandId, stampCount: 2, reason: 'Compra sin tarjeta', ...extra });

    beforeEach(() => {
      role = 'OWNER';
    });

    it('adds the stamps with method PANEL at the customer home location, skipping the cooldown', async () => {
      latestStamp = recentStamp();

      const result = await service.addStampsFromPanel(customerId, panel({ purchaseAmount: 9900 }), userId);

      expect(result).toMatchObject({ scanId: 'scan-1', stampsAdded: 2 });
      expect(prisma.scan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ method: ScanMethod.PANEL, merchantId, stampCount: 2, purchaseAmount: 9900 }),
      });
      expect(prisma.stamp.create).toHaveBeenCalledTimes(2);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'pass.stamps_added',
          reason: 'Compra sin tarjeta',
          after: expect.objectContaining({ method: ScanMethod.PANEL }),
        }),
      });
    });

    it('is only for the OWNER', async () => {
      role = 'STAFF';

      await expect(service.addStampsFromPanel(customerId, panel(), userId)).rejects.toThrow(ForbiddenException);
      expect(prisma.scan.create).not.toHaveBeenCalled();
    });

    it('rejects a location of another brand', async () => {
      vi.mocked(prisma.merchant.findUnique).mockResolvedValueOnce({
        id: 'otro',
        brandId: 'otra-marca',
        name: 'Otro',
        isActive: true,
        brand: { name: 'Otra', status: 'ACTIVE' },
      } as never);

      await expect(
        service.addStampsFromPanel(customerId, panel({ merchantId: 'otro' }), userId),
      ).rejects.toThrow('El local no pertenece a tu marca');
    });

    it('caps the load like the scanner', async () => {
      await expect(service.addStampsFromPanel(customerId, panel({ stampCount: 11 }), userId)).rejects.toThrow(
        'hasta 10 sellos',
      );
    });
  });
});

describe('ScanValidationTokens', () => {
  const tokens = new ScanValidationTokens(config());
  const claims = { passId, method: ScanMethod.QR, userId, merchantId };

  it('round-trips the claims', () => {
    const { token } = tokens.sign(claims);
    expect(tokens.verify(token, { userId, merchantId })).toEqual(claims);
  });

  it('rejects expired, tampered or foreign tokens', () => {
    const now = Date.now();
    const { token } = tokens.sign(claims, now);

    expect(() => tokens.verify(token, { userId, merchantId }, now + VALIDATION_TOKEN_TTL_MS + 1)).toThrow(
      'La validación venció',
    );
    expect(() => tokens.verify(`${token}x`, { userId, merchantId })).toThrow(BadRequestException);
    expect(() => tokens.verify(token, { userId, merchantId: 'otro-local' })).toThrow(BadRequestException);
    expect(() =>
      new ScanValidationTokens(config({ SCAN_VALIDATION_SECRET: 'otra-clave' })).verify(token, { userId, merchantId }),
    ).toThrow(BadRequestException);
  });
});
