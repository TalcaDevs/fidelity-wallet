import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isValidSlug, slugify, SLUG_MAX_LENGTH, SLUG_MIN_LENGTH } from '../common/utils/slug.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PublicMerchantDto, UpdateSlugResponseDto } from './dto/public-merchant.dto.js';

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

  /**
   * Cambia el slug público. Solo el OWNER: el panel no puede escribir la columna directo
   * (grant por columna en 20260924190000), así el slug siempre pasa por slugify y por la
   * unicidad. Cambiarlo invalida los QR ya impresos: el panel debe advertirlo.
   */
  async updateSlug(
    merchantId: string,
    rawSlug: string,
    callerUserId: string,
  ): Promise<UpdateSlugResponseDto> {
    const membership = await this.prisma.merchantUser.findUnique({
      where: { userId_merchantId: { userId: callerUserId, merchantId } },
    });
    if (membership?.role !== 'OWNER') {
      throw new ForbiddenException('Solo el dueño del comercio puede cambiar su link público');
    }

    const slug = slugify(rawSlug);
    if (!isValidSlug(slug)) {
      throw new BadRequestException(
        `El link debe tener entre ${SLUG_MIN_LENGTH} y ${SLUG_MAX_LENGTH} caracteres (letras, números y guiones)`,
      );
    }

    try {
      const updated = await this.prisma.merchant.update({
        where: { id: merchantId },
        data: { slug },
        select: { slug: true },
      });
      return { slug: updated.slug };
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Ese link ya lo usa otro local. Prueba con otro.');
      }
      throw err;
    }
  }
}
