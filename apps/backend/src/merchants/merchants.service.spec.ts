import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { DEFAULT_REGISTRATION } from '@fidelity/shared';
import { cardViewSelect } from '../cards/card-program.js';
import { MerchantsService } from './merchants.service.js';

describe('MerchantsService', () => {
  let service: MerchantsService;
  let prisma: PrismaService;

  const merchantId = 'a0000000-0000-0000-0000-000000000001';
  const ownerId = 'owner-1';

  const promotions = [{ id: 'promo-1', name: 'Café gratis', targetStamps: 5, rewardName: 'Café' }];

  const withProgram = (program: object | null, brand: object = {}) => ({
    id: merchantId,
    name: 'Cafetería Central — Providencia',
    slug: 'cafeteria-central',
    isActive: true,
    brandId: merchantId,
    brand: { name: 'Cafetería Central', status: 'ACTIVE', programs: program ? [program] : [], ...brand },
  });
  const program = {
    id: 'b0000000-0000-4000-8000-000000000001',
    type: 'STAMPS',
    name: 'Tarjeta de sellos',
    stampValidityDays: 90,
    isActive: true,
    design: {},
    details: {},
    registration: {},
    promotions,
  };
  const mockMerchant = withProgram(program, { pesosPerPoint: 1000 });

  const mockLocation = {
    id: merchantId,
    brandId: merchantId,
    name: 'Cafetería Central — Providencia',
    isActive: true,
    brand: { name: 'Cafetería Central', status: 'ACTIVE' },
  };

  beforeEach(() => {
    prisma = {
      merchant: {
        findUnique: vi.fn().mockResolvedValue(mockMerchant),
        update: vi.fn().mockResolvedValue({ slug: 'nuevo-slug' }),
      },
      brandMember: {
        findUnique: vi.fn().mockResolvedValue({ userId: ownerId, brandId: merchantId, merchantId: null, role: 'OWNER' }),
      },
    } as unknown as PrismaService;

    service = new MerchantsService(prisma);
  });

  describe('findPublicBySlug', () => {
    it('only exposes enabled rewards and independent welcome amounts', async () => {
      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue(withProgram({
        ...program,
        stampsEnabled: true,
        pointsEnabled: false,
        welcomeStamps: 2,
        welcomePoints: 30,
        promotions: [...promotions.map((p) => ({ ...p, currency: 'STAMPS' })), { id: 'points-reward', name: 'Postre', rewardName: 'Postre', targetStamps: 100, currency: 'POINTS' }],
      }) as never);
      const result = await service.findPublicBySlug('cafeteria-central');
      expect(result.activePromotions).toHaveLength(1);
      expect(result.activePromotion?.currency).toBe('STAMPS');
      expect(result.card).toMatchObject({ stampsEnabled: true, pointsEnabled: false, welcomeStamps: 2, welcomePoints: 0 });
    });

    it('returns public merchant data with the featured and all active promotions', async () => {
      const result = await service.findPublicBySlug('cafeteria-central');

      expect(result).toEqual({
        id: merchantId,
        name: mockMerchant.name,
        slug: mockMerchant.slug,
        brandId: merchantId,
        brandName: 'Cafetería Central',
        stampValidityDays: 90,
        activePromotion: promotions[0],
        activePromotions: promotions,
        card: expect.objectContaining({
          type: 'STAMPS',
          name: 'Tarjeta de sellos',
          pesosPerPoint: 1000,
          registration: DEFAULT_REGISTRATION,
          closed: false,
        }),
      });
    });

    it('marks a fixed-term card that already ended as closed', async () => {
      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue(
        withProgram({
          ...program,
          cardValidity: 'FIXED_DATE',
          cardExpiresAt: new Date('2020-01-01T00:00:00Z'),
        }) as any,
      );
      expect((await service.findPublicBySlug('cafeteria-central')).card?.closed).toBe(true);
    });

    it('only selects storefront fields (never the owner email) and only active promotions, newest first', async () => {
      await service.findPublicBySlug('cafeteria-central');

      // Lo que protege el email es el select: se verifica el select exacto, no el resultado de un mock.
      expect(prisma.merchant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'cafeteria-central' },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          brandId: true,
          brand: {
            select: {
              name: true,
              status: true,
              pesosPerPoint: true,
              programs: {
                orderBy: { createdAt: 'asc' },
                take: 1,
                select: {
                  ...cardViewSelect,
                  isActive: true,
                  promotions: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, name: true, targetStamps: true, rewardName: true, currency: true },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('normalizes the slug before looking it up', async () => {
      await service.findPublicBySlug('  Cafeteria-Central ');

      expect(prisma.merchant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'cafeteria-central' } }),
      );
    });

    it('returns activePromotion null when the merchant has no active promotion', async () => {
      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue(
        withProgram({ stampValidityDays: 90, isActive: true, promotions: [] }) as any,
      );

      const result = await service.findPublicBySlug('cafeteria-central');

      expect(result.activePromotion).toBeNull();
      expect(result.activePromotions).toEqual([]);
    });

    it('offers no promotions when the brand program is inactive or missing', async () => {
      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValueOnce(
        withProgram({ stampValidityDays: 90, isActive: false, promotions }) as any,
      );
      expect((await service.findPublicBySlug('cafeteria-central')).activePromotions).toEqual([]);

      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValueOnce(withProgram(null) as any);
      const result = await service.findPublicBySlug('cafeteria-central');
      expect(result.activePromotions).toEqual([]);
      expect(result.stampValidityDays).toBeNull();
    });

    it('answers an inactive location or a suspended brand as not found', async () => {
      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValueOnce({ ...mockMerchant, isActive: false } as any);
      await expect(service.findPublicBySlug('cafeteria-central')).rejects.toThrow(NotFoundException);

      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValueOnce(
        withProgram({ stampValidityDays: 90, isActive: true, promotions }, { status: 'SUSPENDED' }) as any,
      );
      await expect(service.findPublicBySlug('cafeteria-central')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the slug does not exist', async () => {
      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue(null);

      await expect(service.findPublicBySlug('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for an empty slug without querying the database', async () => {
      await expect(service.findPublicBySlug('   ')).rejects.toThrow(NotFoundException);
      expect(prisma.merchant.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('updateSlug', () => {
    beforeEach(() => {
      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue(mockLocation as any);
    });

    it('normalizes and saves the new slug for the OWNER', async () => {
      const result = await service.updateSlug(merchantId, '  Café Central! ', ownerId);

      expect(prisma.merchant.update).toHaveBeenCalledWith({
        where: { id: merchantId },
        data: { slug: 'cafe-central' },
        select: { slug: true },
      });
      expect(result).toEqual({ slug: 'nuevo-slug' });
    });

    it('forbids STAFF and non-members', async () => {
      vi.spyOn(prisma.brandMember, 'findUnique').mockResolvedValue({ role: 'STAFF', merchantId } as any);
      await expect(service.updateSlug(merchantId, 'otro', 'staff-1')).rejects.toThrow(ForbiddenException);

      vi.spyOn(prisma.brandMember, 'findUnique').mockResolvedValue(null);
      await expect(service.updateSlug(merchantId, 'otro', 'extraño')).rejects.toThrow(ForbiddenException);

      expect(prisma.merchant.update).not.toHaveBeenCalled();
    });

    it('rejects a slug that is too short after normalization', async () => {
      await expect(service.updateSlug(merchantId, '¡!a', ownerId)).rejects.toThrow(BadRequestException);
      expect(prisma.merchant.update).not.toHaveBeenCalled();
    });

    it('returns 409 when another merchant already uses the slug', async () => {
      vi.spyOn(prisma.merchant, 'update').mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.updateSlug(merchantId, 'cafe-central', ownerId)).rejects.toThrow(ConflictException);
    });
  });
});
