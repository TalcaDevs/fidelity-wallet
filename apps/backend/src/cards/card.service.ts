import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CARD_IMAGE_KINDS,
  IMAGE_FIELD_OF,
  cardConfigProblems,
  normalizeDesign,
  normalizeDetails,
  normalizeRegistration,
  type CardConfig,
  type CardConfigDto,
  type CardDesign,
  type CardImageKind,
  type CardImageUploadDto,
} from '@fidelity/shared';
import type { LoyaltyProgram, Prisma } from '@prisma/client';
import { findBrandProgram, requireActiveBrandOwner } from '../common/access/brand-access.js';
import { recordAudit } from '../common/audit/audit.js';
import type { UploadedImage } from '../common/storage/image.js';
import { PassesService } from '../passes/passes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CardAssetsStorageService } from './card-assets-storage.service.js';
import { prepareCardImage } from './card-image.js';
import { toCardView } from './card-program.js';
import type { SaveCardDto } from './card.dto.js';

const TYPE_LOCKED =
  'Tus clientes tienen saldo vigente: si cambias entre sellos y puntos lo perderían. Mantén el tipo de tarjeta o escríbenos a soporte.';

const designImages = (design: CardDesign) =>
  CARD_IMAGE_KINDS.map((kind) => design[IMAGE_FIELD_OF[kind]]).filter((url): url is string => !!url);

/** La tarjeta de la marca: lo que edita el dueño en /admin/card. */
@Injectable()
export class CardService {
  private readonly logger = new Logger(CardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passes: PassesService,
    private readonly storage: CardAssetsStorageService,
  ) {}

  async get(brandId: string, userId: string): Promise<CardConfigDto> {
    await requireActiveBrandOwner(this.prisma, userId, brandId);
    return this.read(brandId);
  }

  /**
   * Guarda todo de una vez (reglas, recompensas, diseño y detalles) y después publica el diseño
   * en Google Wallet, que actualiza los pases que los clientes ya tienen guardados.
   */
  async save(brandId: string, userId: string, dto: SaveCardDto): Promise<CardConfigDto> {
    await requireActiveBrandOwner(this.prisma, userId, brandId);
    const program = await this.requireProgram(brandId);
    const brand = await this.prisma.brand.findUniqueOrThrow({
      where: { id: brandId },
      select: { pointsEnabled: true },
    });

    const config = this.toConfig(dto);
    const current = toCardView(program).design;
    const problems = cardConfigProblems(config, { pointsEnabled: brand.pointsEnabled });
    // Solo imágenes subidas a la carpeta de la marca: el backend las descarga para dibujar la
    // tira de sellos, y una URL ajena sería una puerta a pedidos hacia cualquier servidor.
    const foreign = designImages(config.design).filter(
      (url) => !this.storage.belongsToBrand(url, brandId) && !designImages(current).includes(url),
    );
    if (foreign.length > 0) problems.push('Una de las imágenes no es válida: vuelve a subirla');
    if (problems.length > 0) throw new BadRequestException(problems);

    if (config.type !== program.type && (await this.hasActiveBalance(program.id))) {
      throw new ConflictException(TYPE_LOCKED);
    }

    const existing = await this.prisma.promotion.findMany({ where: { programId: program.id } });
    const existingIds = new Set(existing.map((p) => p.id));
    if (config.rewards.some((r) => r.id && !existingIds.has(r.id))) {
      throw new BadRequestException('Una de las recompensas no pertenece a tu tarjeta');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.loyaltyProgram.update({
        where: { id: program.id },
        data: {
          type: config.type,
          name: config.name,
          welcomeBalance: config.welcomeBalance,
          dailyStampLimit: config.dailyStampLimit,
          stampValidityDays: config.stampValidityDays,
          cardValidity: config.validity.type,
          cardExpiresAt: config.validity.expiresAt ? new Date(config.validity.expiresAt) : null,
          cardValidityDays: config.validity.days,
          registration: config.registration as unknown as Prisma.InputJsonObject,
          design: config.design as unknown as Prisma.InputJsonObject,
          details: config.details as unknown as Prisma.InputJsonObject,
          designVersion: { increment: 1 },
        },
      });
      await this.saveRewards(tx, program.id, config, existing);
      await recordAudit(tx, {
        actorUserId: userId,
        actorType: 'OWNER',
        action: 'card.update',
        entity: 'LoyaltyProgram',
        entityId: program.id,
        before: { type: program.type, name: program.name },
        after: {
          type: config.type,
          name: config.name,
          rewards: config.rewards.map((r) => ({ name: r.name, target: r.target })),
        },
      });
    });

    void this.passes.publishCard(program.id);
    const kept = new Set(designImages(config.design));
    void this.removeImages(designImages(current).filter((url) => !kept.has(url)));

    return this.read(brandId);
  }

  async uploadImage(
    brandId: string,
    userId: string,
    kind: CardImageKind,
    file: UploadedImage | undefined,
  ): Promise<CardImageUploadDto> {
    await requireActiveBrandOwner(this.prisma, userId, brandId);
    if (!file) throw new BadRequestException('Adjunta una imagen');
    const image = await prepareCardImage(file, kind);
    const path = `${brandId}/${kind}-${randomUUID()}.${image.extension}`;
    await this.storage.upload(path, image.buffer, image.mimeType);
    return { url: this.storage.publicUrl(path) };
  }

  private toConfig(dto: SaveCardDto): CardConfig {
    const { validity } = dto;
    return {
      type: dto.type,
      name: dto.name.trim(),
      rewards: dto.rewards.map((r) => ({ ...(r.id ? { id: r.id } : {}), name: r.name.trim(), target: r.target })),
      welcomeBalance: dto.welcomeBalance,
      dailyStampLimit: dto.dailyStampLimit,
      stampValidityDays: dto.stampValidityDays ?? null,
      validity: {
        type: validity.type,
        expiresAt: validity.type === 'FIXED_DATE' ? (validity.expiresAt ?? null) : null,
        days: validity.type === 'AFTER_JOIN' ? (validity.days ?? null) : null,
      },
      registration: normalizeRegistration(dto.registration, { ensureContact: false }),
      design: normalizeDesign(dto.design),
      details: normalizeDetails(dto.details),
    };
  }

  /**
   * Las recompensas son las promociones del programa. Una que se quita del editor se borra si
   * nunca se canjeó; si ya tiene canjes queda inactiva, para no perder el historial.
   */
  private async saveRewards(
    tx: Prisma.TransactionClient,
    programId: string,
    config: CardConfig,
    existing: { id: string; isActive: boolean }[],
  ): Promise<void> {
    const kept = new Set(config.rewards.map((r) => r.id).filter(Boolean));
    for (const reward of config.rewards) {
      const data = { name: reward.name, rewardName: reward.name, targetStamps: reward.target, isActive: true };
      if (reward.id) {
        await tx.promotion.update({ where: { id: reward.id }, data });
      } else {
        await tx.promotion.create({ data: { ...data, programId } });
      }
    }

    for (const removed of existing.filter((p) => p.isActive && !kept.has(p.id))) {
      const redeemed = await tx.scan.count({ where: { promotionId: removed.id } });
      if (redeemed > 0) {
        await tx.promotion.update({ where: { id: removed.id }, data: { isActive: false } });
      } else {
        await tx.promotion.delete({ where: { id: removed.id } });
      }
    }
  }

  private async read(brandId: string): Promise<CardConfigDto> {
    const program = await this.requireProgram(brandId);
    const [brand, rewards, customers, locations, typeLocked] = await Promise.all([
      this.prisma.brand.findUniqueOrThrow({
        where: { id: brandId },
        select: { name: true, pointsEnabled: true, pesosPerPoint: true },
      }),
      this.prisma.promotion.findMany({
        where: { programId: program.id, isActive: true },
        orderBy: [{ targetStamps: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.pass.count({ where: { programId: program.id } }),
      this.prisma.merchant.count({ where: { brandId, isActive: true } }),
      this.hasActiveBalance(program.id),
    ]);
    const card = toCardView(program);

    return {
      programId: program.id,
      brandName: brand.name,
      designVersion: card.designVersion,
      updatedAt: program.updatedAt.toISOString(),
      points: { enabled: brand.pointsEnabled, pesosPerPoint: brand.pesosPerPoint },
      typeLocked,
      customers,
      locations,
      type: card.type,
      name: card.name,
      rewards: rewards.map((r) => ({ id: r.id, name: r.rewardName, target: r.targetStamps })),
      welcomeBalance: card.welcomeBalance,
      dailyStampLimit: card.dailyStampLimit,
      stampValidityDays: card.stampValidityDays,
      validity: card.validity,
      registration: card.registration,
      design: card.design,
      details: card.details,
    };
  }

  private async requireProgram(brandId: string): Promise<LoyaltyProgram> {
    const program = await findBrandProgram(this.prisma, brandId);
    if (!program) throw new NotFoundException('Tu marca aún no tiene una tarjeta');
    return program;
  }

  /** Algún cliente tiene sellos o puntos vigentes. */
  private async hasActiveBalance(programId: string): Promise<boolean> {
    const now = new Date();
    const stamp = await this.prisma.stamp.findFirst({
      where: { programId, consumedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      select: { id: true },
    });
    return stamp !== null;
  }

  private async removeImages(urls: string[]): Promise<void> {
    const paths = urls.map((url) => this.storage.pathOf(url)).filter((p): p is string => !!p);
    try {
      await this.storage.remove(paths);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`No se pudieron borrar imágenes reemplazadas: ${msg}`);
    }
  }
}
