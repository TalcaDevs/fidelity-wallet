import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { MerchantsService } from './merchants.service.js';

describe('MerchantsService', () => {
  let service: MerchantsService;
  let prisma: PrismaService;

  const mockMerchant = {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Cafetería Central',
    slug: 'cafeteria-central',
    stampValidityDays: 90,
    promotions: [{ id: 'promo-1', name: 'Café gratis', targetStamps: 5, rewardName: 'Café' }],
  };

  beforeEach(() => {
    prisma = {
      merchant: {
        findUnique: vi.fn().mockResolvedValue(mockMerchant),
      },
    } as unknown as PrismaService;

    service = new MerchantsService(prisma);
  });

  it('should return public merchant data with its active promotion', async () => {
    const result = await service.findPublicBySlug('cafeteria-central');

    expect(result).toEqual({
      id: mockMerchant.id,
      name: mockMerchant.name,
      slug: mockMerchant.slug,
      stampValidityDays: 90,
      activePromotion: mockMerchant.promotions[0],
      activePromotions: mockMerchant.promotions,
    });
    expect(result).not.toHaveProperty('email');
  });

  it('should normalize the slug before looking it up', async () => {
    await service.findPublicBySlug('  Cafeteria-Central ');

    expect(prisma.merchant.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'cafeteria-central' } }),
    );
  });

  it('should return activePromotion null when the merchant has no active promotion', async () => {
    vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue({
      ...mockMerchant,
      promotions: [],
    } as any);

    const result = await service.findPublicBySlug('cafeteria-central');

    expect(result.activePromotion).toBeNull();
  });

  it('should throw NotFoundException when the slug does not exist', async () => {
    vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue(null);

    await expect(service.findPublicBySlug('no-existe')).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException for an empty slug without querying the database', async () => {
    await expect(service.findPublicBySlug('   ')).rejects.toThrow(NotFoundException);
    expect(prisma.merchant.findUnique).not.toHaveBeenCalled();
  });
});
