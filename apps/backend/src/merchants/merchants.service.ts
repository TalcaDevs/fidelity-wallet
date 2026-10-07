import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cardViewSelect, toCardView } from '../cards/card-program.js';
import { isLocationOperational, resolveLocationAccess } from '../common/access/brand-access.js';
import { isValidSlug, slugify, SLUG_MAX_LENGTH, SLUG_MIN_LENGTH } from '../common/utils/slug.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PublicMerchantDto, UpdateSlugResponseDto } from './dto/public-merchant.dto.js';

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resuelve el slug público de la landing al local y su promoción vigente.
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
        })
      : null;

    if (!merchant || !isLocationOperational(merchant)) {
      throw new NotFoundException('El comercio no existe');
    }

    const program = merchant.brand.programs[0];
    const card = program ? toCardView(program) : null;
    const promotions = program?.isActive && card
      ? program.promotions.filter((p) => (p.currency ?? card.type) === 'POINTS' ? card.pointsEnabled : card.stampsEnabled)
      : [];
    return {
      id: merchant.id,
      name: merchant.name,
      slug: merchant.slug,
      brandId: merchant.brandId,
      brandName: merchant.brand.name,
      stampValidityDays: program?.stampValidityDays ?? null,
      // La landing destaca la más reciente, pero los sellos sirven para cualquiera de las activas.
      activePromotion: promotions[0] ?? null,
      activePromotions: promotions,
      card: card && {
        type: card.type,
        stampsEnabled: card.stampsEnabled,
        pointsEnabled: card.pointsEnabled,
        name: card.name,
        backgroundColor: card.design.backgroundColor,
        textColor: card.design.textColor,
        logoUrl: card.design.logoUrl,
        heroImageUrl: card.design.heroImageUrl,
        pesosPerPoint: merchant.brand.pesosPerPoint,
        welcomeBalance: card.welcomeBalance,
        welcomeStamps: card.stampsEnabled ? card.welcomeStamps : 0,
        welcomePoints: card.pointsEnabled ? card.welcomePoints : 0,
        registration: card.registration,
        closed:
          card.validity.type === 'FIXED_DATE' &&
          !!card.validity.expiresAt &&
          new Date(card.validity.expiresAt) <= new Date(),
      },
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
    const ownerOnlyMessage = 'Solo el dueño del comercio puede cambiar su link público';
    await resolveLocationAccess(this.prisma, callerUserId, merchantId, {
      ownerOnly: true,
      forbiddenMessage: ownerOnlyMessage,
      ownerMessage: ownerOnlyMessage,
    });

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
