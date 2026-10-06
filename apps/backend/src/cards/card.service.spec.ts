import 'reflect-metadata';
import { BadRequestException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { DEFAULT_CARD_DESIGN, DEFAULT_CARD_DETAILS, DEFAULT_REGISTRATION } from '@fidelity/shared';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PassesService } from '../passes/passes.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { CardAssetsStorageService } from './card-assets-storage.service.js';
import { SaveCardDto } from './card.dto.js';
import { CardService } from './card.service.js';

const brandId = 'a0000000-0000-4000-8000-000000000001';
const programId = 'b0000000-0000-4000-8000-000000000001';
const userId = 'u0000000-0000-4000-8000-000000000001';
const rewardA = 'c0000000-0000-4000-8000-00000000000a';
const rewardB = 'c0000000-0000-4000-8000-00000000000b';
const bucket = 'http://127.0.0.1:54321/storage/v1/object/public/card-assets';

const program = (overrides: Record<string, unknown> = {}) => ({
  id: programId,
  brandId,
  type: 'STAMPS',
  stampsEnabled: true,
  pointsEnabled: false,
  name: 'Tarjeta de sellos',
  isActive: true,
  stampValidityDays: null,
  welcomeBalance: 0,
  dailyStampLimit: true,
  cardValidity: 'UNLIMITED',
  cardExpiresAt: null,
  cardValidityDays: null,
  design: { logoUrl: `${bucket}/${brandId}/logo-old.png` },
  details: {},
  registration: {},
  designVersion: 4,
  updatedAt: new Date('2026-10-03T12:00:00Z'),
  ...overrides,
});

const body = (overrides: Partial<SaveCardDto> = {}): SaveCardDto =>
  ({
    type: 'STAMPS',
    stampsEnabled: true,
    pointsEnabled: false,
    name: 'Tarjeta Café',
    rewards: [{ id: rewardA, name: 'Café gratis', target: 8 }, { name: 'Torta', target: 12 }],
    welcomeBalance: 1,
    dailyStampLimit: true,
    stampValidityDays: 90,
    validity: { type: 'UNLIMITED', expiresAt: null, days: null },
    registration: { ...DEFAULT_REGISTRATION, name: 'REQUIRED' },
    design: { ...DEFAULT_CARD_DESIGN, logoUrl: `${bucket}/${brandId}/logo-new.png` },
    details: { ...DEFAULT_CARD_DETAILS },
    ...overrides,
  }) as SaveCardDto;

function setup({ role = 'OWNER', pointsEnabled = false, activeBalance = false, redeemed = 0 } = {}) {
  const prisma = {
    brandMember: { findUnique: vi.fn().mockResolvedValue({ role }) },
    brand: {
      findUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ name: 'Café Demo', pointsEnabled, pesosPerPoint: 1000 }),
    },
    loyaltyProgram: {
      findFirst: vi.fn().mockResolvedValue(program()),
      update: vi.fn().mockResolvedValue(program()),
    },
    promotion: {
      findMany: vi.fn().mockResolvedValue([
        { id: rewardA, isActive: true, rewardName: 'Café', targetStamps: 10 },
        { id: rewardB, isActive: true, rewardName: 'Almuerzo', targetStamps: 20 },
      ]),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    scan: { count: vi.fn().mockResolvedValue(redeemed) },
    stamp: { findFirst: vi.fn().mockResolvedValue(activeBalance ? { id: 's-1' } : null) },
    pass: { count: vi.fn().mockResolvedValue(42) },
    merchant: { count: vi.fn().mockResolvedValue(2) },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
  };
  const passes = { publishCard: vi.fn().mockResolvedValue(undefined) };
  const storage = {
    belongsToBrand: vi.fn((url: string, id: string) => url.startsWith(`${bucket}/${id}/`)),
    pathOf: vi.fn((url: string) => url.replace(`${bucket}/`, '')),
    publicUrl: vi.fn((path: string) => `${bucket}/${path}`),
    upload: vi.fn(),
    remove: vi.fn(),
  };
  const service = new CardService(
    prisma as unknown as PrismaService,
    passes as unknown as PassesService,
    storage as unknown as CardAssetsStorageService,
  );
  return { prisma, passes, storage, service };
}

describe('CardService', () => {
  it('returns the card with its rewards, points settings and usage', async () => {
    const { service } = setup({ activeBalance: true });
    const card = await service.get(brandId, userId);

    expect(card).toMatchObject({
      programId,
      brandName: 'Café Demo',
      type: 'STAMPS',
      designVersion: 4,
      points: { enabled: false, pesosPerPoint: 1000 },
      typeLocked: true,
      customers: 42,
      locations: 2,
      rewards: [
        { id: rewardA, name: 'Café', target: 10 },
        { id: rewardB, name: 'Almuerzo', target: 20 },
      ],
    });
    expect(card.design.logoUrl).toBe(`${bucket}/${brandId}/logo-old.png`);
  });

  it('rejects a STAFF member', async () => {
    const { service } = setup({ role: 'STAFF' });
    await expect(service.get(brandId, userId)).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('save', () => {
    it('saves rules, design and rewards in one transaction and publishes the card', async () => {
      const { service, prisma, passes, storage } = setup();
      await service.save(brandId, userId, body());

      expect(prisma.loyaltyProgram.update).toHaveBeenCalledWith({
        where: { id: programId },
        data: expect.objectContaining({
          type: 'STAMPS',
          name: 'Tarjeta Café',
          welcomeBalance: 1,
          stampValidityDays: 90,
          cardValidity: 'UNLIMITED',
          registration: expect.objectContaining({ name: 'REQUIRED' }),
          designVersion: { increment: 1 },
        }),
      });
      expect(prisma.promotion.update).toHaveBeenCalledWith({
        where: { id: rewardA },
        data: { name: 'Café gratis', rewardName: 'Café gratis', targetStamps: 8, isActive: true, currency: 'STAMPS' },
      });
      expect(prisma.promotion.create).toHaveBeenCalledWith({
        data: { name: 'Torta', rewardName: 'Torta', targetStamps: 12, isActive: true, programId, currency: 'STAMPS' },
      });
      // B no se canjeó nunca: se borra.
      expect(prisma.promotion.delete).toHaveBeenCalledWith({ where: { id: rewardB } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'card.update', entityId: programId }),
      });
      expect(passes.publishCard).toHaveBeenCalledWith(programId);
      // El logo reemplazado se borra del bucket.
      expect(storage.remove).toHaveBeenCalledWith([`${brandId}/logo-old.png`]);
    });

    it('keeps a removed reward that was already redeemed, inactive', async () => {
      const { service, prisma } = setup({ redeemed: 3 });
      await service.save(brandId, userId, body());
      expect(prisma.promotion.delete).not.toHaveBeenCalled();
      expect(prisma.promotion.update).toHaveBeenCalledWith({ where: { id: rewardB }, data: { isActive: false } });
    });

    it('returns every business problem at once', async () => {
      const { service, prisma } = setup();
      const error = await service
        .save(brandId, userId, body({ name: 'X', rewards: [] }))
        .catch((err: unknown) => err as BadRequestException);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        message: [expect.stringMatching(/nombre de la tarjeta/), 'Agrega al menos una recompensa'],
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('does not allow points unless they are enabled for the brand', async () => {
      const points = body({ type: 'POINTS', rewards: [{ name: 'Postre', target: 500 }] });
      await expect(setup().service.save(brandId, userId, points)).rejects.toBeInstanceOf(BadRequestException);
      await expect(setup({ pointsEnabled: true }).service.save(brandId, userId, points)).resolves.toBeDefined();
    });

    it('does not switch between stamps and points while customers have balance', async () => {
      const { service, prisma } = setup({ pointsEnabled: true, activeBalance: true });
      await expect(
        service.save(brandId, userId, body({ type: 'POINTS', stampsEnabled: false, pointsEnabled: true, rewards: [{ name: 'Postre', target: 500 }] })),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('only accepts images uploaded to the brand folder', async () => {
      const { service } = setup();
      await expect(
        service.save(
          brandId,
          userId,
          body({ design: { ...DEFAULT_CARD_DESIGN, heroImageUrl: 'https://evil.example/hero.jpg' } }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects rewards from another card', async () => {
      const { service } = setup();
      await expect(
        service.save(
          brandId,
          userId,
          body({ rewards: [{ id: 'c0000000-0000-4000-8000-0000000000ff', name: 'Ajena', target: 3 }] }),
        ),
      ).rejects.toThrow('no pertenece a tu tarjeta');
    });

    it('does not grandfather an unsafe image already stored in the card', async () => {
      const { service, prisma } = setup();
      const logoUrl = `${bucket}/another-brand/logo.png`;
      prisma.loyaltyProgram.findFirst.mockResolvedValue(program({ design: { logoUrl } }));
      await expect(service.save(brandId, userId, body({
        design: { ...DEFAULT_CARD_DESIGN, logoUrl },
      }))).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('never deletes replaced images belonging to another brand', async () => {
      const { service, prisma, storage } = setup();
      prisma.loyaltyProgram.findFirst.mockResolvedValue(program({
        design: { logoUrl: `${bucket}/another-brand/logo.png` },
      }));
      await service.save(brandId, userId, body());
      expect(storage.pathOf).not.toHaveBeenCalled();
      expect(storage.remove).not.toHaveBeenCalled();
    });

    it('logs a background Wallet failure without failing the saved card', async () => {
      const { service, passes } = setup();
      passes.publishCard.mockRejectedValue(new Error('Wallet offline'));
      const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      try {
        await expect(service.save(brandId, userId, body())).resolves.toBeDefined();
        expect(log).toHaveBeenCalledWith(expect.stringContaining('Wallet offline'));
      } finally {
        log.mockRestore();
      }
    });

    it.each([
      { type: 'UNLIMITED', expiresAt: null, days: null },
      { type: 'FIXED_DATE', expiresAt: '2099-01-01T00:00:00.000Z', days: null },
      { type: 'AFTER_JOIN', expiresAt: null, days: 30 },
    ] as const)('clears inactive validity fields for $type', async (expected) => {
      const { service, prisma } = setup();
      await service.save(brandId, userId, body({
        validity: { type: expected.type, expiresAt: '2099-01-01T00:00:00.000Z', days: 30 },
      }));
      expect(prisma.loyaltyProgram.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          cardValidity: expected.type,
          cardExpiresAt: expected.expiresAt ? new Date(expected.expiresAt) : null,
          cardValidityDays: expected.days,
        }),
      }));
    });
  });

  it('resizes an uploaded logo and stores it in the brand folder', async () => {
    const { service, storage } = setup();
    const buffer = await sharp({ create: { width: 900, height: 600, channels: 3, background: '#a3472f' } })
      .webp()
      .toBuffer();

    const { url } = await service.uploadImage(brandId, userId, 'logo', {
      originalname: 'logo.webp',
      mimetype: 'image/webp',
      size: buffer.length,
      buffer,
    });

    const [path, stored, mimeType] = storage.upload.mock.calls[0];
    expect(path).toMatch(new RegExp(`^${brandId}/logo-[0-9a-f-]+\\.png$`));
    expect(mimeType).toBe('image/png');
    const meta = await sharp(stored).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([660, 660, 'png']);
    expect(url).toBe(`${bucket}/${path}`);
  });

  it('rejects a file that is not an image', async () => {
    const { service } = setup();
    const buffer = Buffer.from('<svg onload="alert(1)"></svg>');
    await expect(
      service.uploadImage(brandId, userId, 'hero', { originalname: 'x.svg', mimetype: 'image/svg+xml', size: buffer.length, buffer }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SaveCardDto', () => {
  it('rejects unknown types and malformed rewards', async () => {
    const errors = await validate(
      plainToInstance(SaveCardDto, { ...body(), type: 'CASHBACK', rewards: [{ name: 3, target: 'x' }] }),
    );
    expect(errors.map((e) => e.property).sort()).toEqual(['rewards', 'type']);
  });
});
