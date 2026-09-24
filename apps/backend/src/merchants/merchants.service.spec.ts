import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { MerchantsService } from './merchants.service.js';

describe('MerchantsService', () => {
  let service: MerchantsService;
  let prisma: PrismaService;

  const merchantId = 'a0000000-0000-0000-0000-000000000001';
  const ownerId = 'owner-1';

  const mockMerchant = {
    id: merchantId,
    name: 'Cafetería Central',
    slug: 'cafeteria-central',
    stampValidityDays: 90,
    promotions: [{ id: 'promo-1', name: 'Café gratis', targetStamps: 5, rewardName: 'Café' }],
  };

  beforeEach(() => {
    prisma = {
      merchant: {
        findUnique: vi.fn().mockResolvedValue(mockMerchant),
        update: vi.fn().mockResolvedValue({ slug: 'nuevo-slug' }),
      },
      merchantUser: {
        findUnique: vi.fn().mockResolvedValue({ userId: ownerId, merchantId, role: 'OWNER' }),
      },
    } as unknown as PrismaService;

    service = new MerchantsService(prisma);
  });

  describe('findPublicBySlug', () => {
    it('returns public merchant data with the featured and all active promotions', async () => {
      const result = await service.findPublicBySlug('cafeteria-central');

      expect(result).toEqual({
        id: merchantId,
        name: mockMerchant.name,
        slug: mockMerchant.slug,
        stampValidityDays: 90,
        activePromotion: mockMerchant.promotions[0],
        activePromotions: mockMerchant.promotions,
      });
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
          stampValidityDays: true,
          promotions: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, targetStamps: true, rewardName: true },
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
      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue({ ...mockMerchant, promotions: [] } as any);

      const result = await service.findPublicBySlug('cafeteria-central');

      expect(result.activePromotion).toBeNull();
      expect(result.activePromotions).toEqual([]);
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
      vi.spyOn(prisma.merchantUser, 'findUnique').mockResolvedValue({ role: 'STAFF' } as any);
      await expect(service.updateSlug(merchantId, 'otro', 'staff-1')).rejects.toThrow(ForbiddenException);

      vi.spyOn(prisma.merchantUser, 'findUnique').mockResolvedValue(null);
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
