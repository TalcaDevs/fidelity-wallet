import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PublicMerchantDto } from './dto/public-merchant.dto.js';

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resuelve el slug público de la landing al comercio y su promoción vigente.
   * Solo expone datos de vitrina: nunca el email del dueño ni datos de clientes.
   */
  async findPublicBySlug(rawSlug: string): Promise<PublicMerchantDto> {
    const slug = rawSlug?.trim().toLowerCase();
    const merchant = slug
      ? await this.prisma.merchant.findUnique({
          where: { slug },
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
        })
      : null;

    if (!merchant) {
      throw new NotFoundException('El comercio no existe');
    }

    const { promotions, ...publicMerchant } = merchant;
    return {
      ...publicMerchant,
      // La landing destaca la más reciente, pero los sellos sirven para cualquiera de las activas.
      activePromotion: promotions[0] ?? null,
      activePromotions: promotions,
    };
  }
}
