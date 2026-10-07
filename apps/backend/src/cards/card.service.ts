import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CARD_IMAGE_KINDS,
  IMAGE_FIELD_OF,
  cardConfigProblems,
  getPlan,
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
import {
  activeRewardCount,
  cardRewardLimits,
  cardRewardPlanLimit,
  cardRewardPolicy,
  validateCardRewardLimits,
  type StoredCardReward,
} from '../common/plan/card-reward-limits.js';
import { PLAN_LIMIT_CODE } from '../common/plan/plan-limits.js';
import type { UploadedImage } from '../common/storage/image.js';
import { PassesService } from '../passes/passes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CardAssetsStorageService } from './card-assets-storage.service.js';
import { prepareCardImage } from './card-image.js';
import { toCardView } from './card-program.js';
import type { SaveCardDto } from './card.dto.js';

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
    private readonly configService: ConfigService,
  ) {
    validateCardRewardLimits(configService);
  }

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
    let config = this.toConfig(dto, program);
    let current = toCardView(program).design;
    // Solo imágenes subidas a la carpeta de la marca: el backend las descarga para dibujar la
    // tira de sellos, y una URL ajena sería una puerta a pedidos hacia cualquier servidor.
    const foreign = designImages(config.design).filter(
      (url) => !this.storage.belongsToBrand(url, brandId),
    );
    if (foreign.length > 0) throw new BadRequestException(['Una de las imágenes no es válida: vuelve a subirla']);

    await this.prisma.$transaction(async (tx) => {
      // Configuración toma primero marca y después programa; caja comparte el lock del programa.
      await tx.$queryRaw`SELECT id FROM "Brand" WHERE id = ${brandId}::uuid FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM "LoyaltyProgram" WHERE id = ${program.id}::uuid FOR UPDATE`;
      const currentBrand = await tx.brand.findUniqueOrThrow({ where: { id: brandId }, select: { pointsEnabled: true, planId: true } });
      const currentProgram = await tx.loyaltyProgram.findFirst({ where: { id: program.id, brandId } });
      if (!currentProgram) throw new NotFoundException('Tu marca aún no tiene una tarjeta');
      config = this.toConfig(dto, currentProgram);
      const currentCard = toCardView(currentProgram);
      current = currentCard.design;
      const existing = await tx.promotion.findMany({ where: { programId: program.id } });
      const policy = cardRewardPolicy({
        existing,
        requested: config.rewards,
        currentModalities: currentCard,
        requestedModalities: config,
        planLimit: cardRewardPlanLimit(this.configService, currentBrand.planId),
      });
      // La moneda de un premio existente se resuelve desde BD bajo lock antes de validarlo.
      if (policy.problems.length > 0) {
        throw new BadRequestException(policy.problems.length === 1 ? policy.problems[0] : policy.problems);
      }
      config = { ...config, rewards: policy.rewards };
      const { rewardUsage: usage, rewardLimit, rewardPlanLimit, requestedUsage } = policy;
      if (requestedUsage > rewardLimit) {
        const legacy = usage > rewardPlanLimit
          ? ` Puedes conservar hasta ${rewardLimit} recompensas activas existentes, sin aumentar su cantidad.`
          : '';
        throw new ForbiddenException({
          code: PLAN_LIMIT_CODE,
          resource: 'rewards',
          limit: rewardLimit,
          planLimit: rewardPlanLimit,
          usage,
          message: `Tu plan ${getPlan(currentBrand.planId).name} permite ${rewardPlanLimit} recompensas activas.${legacy} Reduce las recompensas activas o sube de plan para agregar más.`,
        });
      }
      const currentProblems = cardConfigProblems(config, { pointsEnabled: currentBrand.pointsEnabled, maxRewards: rewardLimit });
      if (currentProblems.length > 0) throw new BadRequestException(currentProblems);
      await tx.loyaltyProgram.update({
        where: { id: program.id },
        data: {
          type: config.type,
          stampsEnabled: config.stampsEnabled,
          pointsEnabled: config.pointsEnabled,
          name: config.name,
          welcomeBalance: config.type === 'POINTS' ? config.welcomePoints : config.welcomeStamps,
          welcomeStamps: config.welcomeStamps,
          welcomePoints: config.welcomePoints,
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
      await this.saveRewards(tx, program.id, config, policy.removedRewards);
      await recordAudit(tx, {
        actorUserId: userId,
        actorType: 'OWNER',
        action: 'card.update',
        entity: 'LoyaltyProgram',
        entityId: program.id,
        before: {
          type: currentProgram.type,
          name: currentProgram.name,
          stampsEnabled: currentProgram.stampsEnabled,
          pointsEnabled: currentProgram.pointsEnabled,
          welcomeStamps: currentCard.welcomeStamps,
          welcomePoints: currentCard.welcomePoints,
        },
        after: {
          type: config.type,
          name: config.name,
          stampsEnabled: config.stampsEnabled,
          pointsEnabled: config.pointsEnabled,
          welcomeStamps: config.welcomeStamps,
          welcomePoints: config.welcomePoints,
          rewards: config.rewards.map((r) => ({ name: r.name, target: r.target })),
        },
      });
    });

    void this.passes.publishCard(program.id).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`No se pudo publicar la tarjeta ${program.id} en Wallet: ${message}`);
    });
    const kept = new Set(designImages(config.design));
    void this.removeImages(brandId, designImages(current).filter((url) => !kept.has(url)));

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

  private toConfig(dto: SaveCardDto, program: LoyaltyProgram): CardConfig {
    const { validity } = dto;
    return {
      type: dto.type,
      stampsEnabled: dto.stampsEnabled,
      pointsEnabled: dto.pointsEnabled,
      name: dto.name.trim(),
      rewards: dto.rewards.map((r) => ({ ...(r.id ? { id: r.id } : {}), name: r.name.trim(), target: r.target, currency: r.currency })),
      welcomeBalance: dto.welcomeBalance,
      welcomeStamps: dto.welcomeStamps ?? (dto.type === 'STAMPS' ? dto.welcomeBalance : toCardView(program).welcomeStamps),
      welcomePoints: dto.welcomePoints ?? (dto.type === 'POINTS' ? dto.welcomeBalance : toCardView(program).welcomePoints),
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
    removedRewards: readonly StoredCardReward[],
  ): Promise<void> {
    for (const reward of config.rewards) {
      const data = { name: reward.name, rewardName: reward.name, targetStamps: reward.target, currency: reward.currency ?? 'STAMPS', isActive: true };
      if (reward.id) {
        await tx.promotion.update({ where: { id: reward.id }, data });
      } else {
        await tx.promotion.create({ data: { ...data, programId } });
      }
    }

    for (const removed of removedRewards) {
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
    const [brand, rewards, customers, locations] = await Promise.all([
      this.prisma.brand.findUniqueOrThrow({
        where: { id: brandId },
        select: { name: true, pointsEnabled: true, pesosPerPoint: true, planId: true },
      }),
      this.prisma.promotion.findMany({
        where: { programId: program.id, isActive: true },
        orderBy: [{ targetStamps: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.pass.count({ where: { programId: program.id } }),
      this.prisma.merchant.count({ where: { brandId, isActive: true } }),
    ]);
    const card = toCardView(program);

    return {
      programId: program.id,
      brandName: brand.name,
      designVersion: card.designVersion,
      updatedAt: program.updatedAt.toISOString(),
      points: { enabled: brand.pointsEnabled, pesosPerPoint: brand.pesosPerPoint },
      typeLocked: false,
      ...cardRewardLimits(this.configService, brand.planId, activeRewardCount(rewards, card)),
      customers,
      locations,
      type: card.type,
      stampsEnabled: program.stampsEnabled,
      pointsEnabled: program.pointsEnabled,
      name: card.name,
      rewards: rewards.map((r) => ({ id: r.id, name: r.rewardName, target: r.targetStamps, currency: r.currency })),
      welcomeBalance: card.welcomeBalance,
      welcomeStamps: card.welcomeStamps,
      welcomePoints: card.welcomePoints,
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

  private async removeImages(brandId: string, urls: string[]): Promise<void> {
    const paths = urls
      .filter((url) => this.storage.belongsToBrand(url, brandId))
      .map((url) => this.storage.pathOf(url))
      .filter((p): p is string => !!p);
    if (paths.length === 0) return;
    try {
      await this.storage.remove(paths);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`No se pudieron borrar imágenes reemplazadas: ${msg}`);
    }
  }
}
