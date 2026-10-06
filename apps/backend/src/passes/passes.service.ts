import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { firstName } from '@fidelity/shared';
import { Brand, Customer, Pass, Prisma } from '@prisma/client';
import { passExpiresAt, toCardView } from '../cards/card-program.js';
import { findBrandProgram, resolveLocationAccess } from '../common/access/brand-access.js';
import { maskEmail, maskPhone, maskRut } from '../common/utils/mask.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeneratePassDto, PassEmissionResponseDto } from './dto/generate-pass.dto.js';
import type { CardClassData, PassData } from './interfaces/pass-data.interface.js';
import { ApplePassService } from './services/apple-pass.service.js';
import { GoogleWalletService } from './services/google-wallet.service.js';

/** Nombre que muestra la tarjeta en la billetera: el primer nombre, o un dato enmascarado. */
export function passCustomerLabel(customer: Customer | null): string {
  if (!customer) return 'Cliente';
  const name = firstName(customer.name);
  if (name) return name;
  if (customer.phone) return maskPhone(customer.phone);
  if (customer.email) return maskEmail(customer.email);
  if (customer.rut) return maskRut(customer.rut);
  return 'Cliente';
}

export type PassWithBrandAndCustomer = Pass & {
  brand: Brand;
  customer: Customer | null;
};

export interface PassTarget {
  programId: string;
  brandId: string;
  merchantId: string;
}

const passRelations = { brand: true, customer: true } as const;

/** Pases que se reenvían a Google a la vez al publicar un cambio de la tarjeta. */
const REPUBLISH_CONCURRENCY = 5;
const REPUBLISH_PAGE = 200;

interface PublishRun {
  /** Llegó otra publicación mientras corría: al terminar se publica una vez más. */
  again: boolean;
  refreshPasses: boolean;
}

@Injectable()
export class PassesService {
  private readonly logger = new Logger(PassesService.name);
  private readonly passUpdateQueues = new Map<string, Promise<void>>();
  private readonly publishRuns = new Map<string, PublishRun>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly applePassService: ApplePassService,
    private readonly googleWalletService: GoogleWalletService,
  ) {}

  /**
   * Punto único de emisión y recuperación de pases con entropía de 32 bytes y manejo de P2002.
   */
  async findOrCreatePass(
    customerId: string,
    target: PassTarget,
    tx?: Prisma.TransactionClient,
  ): Promise<{ pass: Pass; isNew: boolean }> {
    const prisma = tx ?? this.prisma;
    const uniqueKey = { customerId_programId: { customerId, programId: target.programId } };
    let pass = await prisma.pass.findUnique({ where: uniqueKey });

    if (pass) {
      return { pass, isNew: false };
    }

    const passToken = randomBytes(32).toString('hex');
    try {
      pass = await prisma.pass.create({
        // brandId lo vuelve a fijar el trigger pass_derive_brand desde el programa.
        data: {
          customerId,
          programId: target.programId,
          brandId: target.brandId,
          merchantId: target.merchantId,
          passToken,
        },
      });
      return { pass, isNew: true };
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // En PostgreSQL, una violación de clave única (P2002) aborta la transacción interactiva.
        // Si se provee `tx`, cualquier query posterior sobre `tx` fallará con 500 (transacción abortada).
        // Por ello, re-lanzamos el error para que la transacción externa aborte y se reintente limpiamente.
        if (tx) {
          throw err;
        }
        pass = await prisma.pass.findUnique({ where: uniqueKey });
        if (!pass) throw err;
        return { pass, isNew: false };
      }
      throw err;
    }
  }

  async generatePass(
    dto: GeneratePassDto,
    callerUserId: string,
  ): Promise<PassEmissionResponseDto> {
    if (!callerUserId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // Solo el OWNER: la respuesta trae los links de billetera del pase de un cliente, y un mesero
    // que conozca un customerId podría sacarle la tarjeta a otro.
    const { merchant } = await resolveLocationAccess(this.prisma, callerUserId, dto.merchantId, {
      ownerOnly: true,
      forbiddenMessage: 'El usuario no está autorizado como miembro de este comercio',
      ownerMessage: 'Solo el dueño del comercio puede emitir pases manualmente',
    });

    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Cliente con ID ${dto.customerId} no encontrado`);
    }

    const program = await findBrandProgram(this.prisma, merchant.brandId);
    const brand = await this.prisma.brand.findUnique({ where: { id: merchant.brandId } });
    if (!program || !brand) {
      throw new BadRequestException('El comercio no tiene una promoción activa configurada');
    }

    const { pass } = await this.findOrCreatePass(dto.customerId, {
      programId: program.id,
      brandId: merchant.brandId,
      merchantId: merchant.id,
    });

    const fullPass: PassWithBrandAndCustomer = {
      ...pass,
      brand,
      customer,
    };

    const passData = await this.buildPassData(fullPass, dto.promotionId, undefined, true);
    if (!passData) {
      throw new BadRequestException('El comercio no tiene una promoción activa configurada');
    }

    const appleWalletUrl = this.applePassService.getPassUrl(pass.passToken);
    const googleWalletUrl = this.googleWalletService.generateSaveUrl(passData);

    return {
      passId: pass.id,
      passToken: pass.passToken,
      appleWalletUrl,
      googleWalletUrl,
      activeStamps: passData.activeStamps,
      targetStamps: passData.targetStamps,
      rewardName: passData.rewardName,
      nextExpiryAt: passData.nextExpiryAt,
    };
  }

  /**
   * Genera las URLs de billetera para un pase (utilizado por el alta anónima de clientes).
   */
  async getWalletUrlsForPass(
    passOrId: string | PassWithBrandAndCustomer,
    tx?: Prisma.TransactionClient,
  ): Promise<{ appleWalletUrl: string; googleWalletUrl: string } | null> {
    const prisma = tx ?? this.prisma;
    const pass =
      typeof passOrId === 'string'
        ? await prisma.pass.findUnique({
            where: { id: passOrId },
            include: passRelations,
          })
        : passOrId;

    if (!pass) return null;

    const passData = await this.buildPassData(pass, undefined, tx, true);
    if (!passData) return null;

    return {
      appleWalletUrl: this.applePassService.getPassUrl(pass.passToken),
      googleWalletUrl: this.googleWalletService.generateSaveUrl(passData),
    };
  }

  async getApplePassBuffer(passToken: string): Promise<Buffer> {
    const pass = await this.prisma.pass.findUnique({
      where: { passToken },
      include: passRelations,
    });

    if (!pass) {
      throw new NotFoundException('Pase no encontrado');
    }

    const passData = await this.buildPassData(pass);
    if (!passData) {
      throw new BadRequestException('El comercio no tiene una promoción activa configurada');
    }

    return this.applePassService.generatePassBuffer(passData);
  }

  async notifyPassUpdate(passId: string): Promise<void> {
    const previousQueue = this.passUpdateQueues.get(passId) ?? Promise.resolve();

    const currentTask = previousQueue
      .catch(() => {})
      .then(async () => {
        await this.dispatchPassUpdate(passId);
      })
      .finally(() => {
        if (this.passUpdateQueues.get(passId) === currentTask) {
          this.passUpdateQueues.delete(passId);
        }
      });

    this.passUpdateQueues.set(passId, currentTask);
    return currentTask;
  }

  private async dispatchPassUpdate(passId: string): Promise<void> {
    try {
      const pass = await this.prisma.pass.findUnique({
        where: { id: passId },
        include: passRelations,
      });

      if (!pass) return;

      const passData = await this.buildPassData(pass);
      if (!passData) return;

      this.logger.log(
        `Dispatching wallet update for pass ${passId} (activeStamps: ${passData.activeStamps})`,
      );
      await Promise.allSettled([this.googleWalletService.updateLoyaltyObject(passData)]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to dispatch background wallet push for pass ${passId}: ${msg}`);
    }
  }

  /**
   * Publica el diseño de la tarjeta en Google Wallet y, con refreshPasses, reenvía cada pase
   * emitido (saldo, textos y tira de sellos con la versión nueva del diseño). Corre en segundo
   * plano. Dos publicaciones de la misma tarjeta no se pisan: si llega otra mientras corre una,
   * al terminar se publica una sola vez más, con lo último guardado.
   */
  async publishCard(programId: string, { refreshPasses = true } = {}): Promise<void> {
    const running = this.publishRuns.get(programId);
    if (running) {
      running.again = true;
      running.refreshPasses ||= refreshPasses;
      return;
    }
    const run: PublishRun = { again: false, refreshPasses };
    this.publishRuns.set(programId, run);
    try {
      do {
        const refresh = run.refreshPasses;
        run.again = false;
        run.refreshPasses = false;
        await this.publishOnce(programId, refresh);
      } while (run.again);
    } finally {
      this.publishRuns.delete(programId);
    }
  }

  /**
   * Las sucursales con ubicación van en la clase (aviso al pasar cerca): si cambian, se vuelve a
   * publicar la clase. Los pases no cambian, así que no se reenvían.
   */
  async refreshNearbyLocations(brandId: string): Promise<void> {
    try {
      const program = await findBrandProgram(this.prisma, brandId);
      if (!program || !toCardView(program).details.nearbyNotifications) return;
      await this.publishCard(program.id, { refreshPasses: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to refresh locations of brand ${brandId}: ${msg}`);
    }
  }

  private async publishOnce(programId: string, refreshPasses: boolean): Promise<void> {
    try {
      const cardClass = await this.cardClassData(this.prisma, programId, true);
      if (!cardClass) return;
      await this.googleWalletService.upsertLoyaltyClass(cardClass);
      if (!refreshPasses) return;

      let cursor: string | undefined;
      let total = 0;
      for (;;) {
        const page = await this.prisma.pass.findMany({
          where: { programId },
          select: { id: true },
          orderBy: { id: 'asc' },
          take: REPUBLISH_PAGE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });
        if (page.length === 0) break;
        for (let i = 0; i < page.length; i += REPUBLISH_CONCURRENCY) {
          await Promise.all(
            page.slice(i, i + REPUBLISH_CONCURRENCY).map((p) => this.notifyPassUpdate(p.id)),
          );
        }
        total += page.length;
        cursor = page[page.length - 1].id;
      }
      this.logger.log(`Card ${programId} published; ${total} passes refreshed`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to publish card ${programId}: ${msg}`);
    }
  }

  private async cardClassData(
    prisma: Prisma.TransactionClient | PrismaService,
    programId: string,
    includeLocations: boolean,
  ): Promise<CardClassData | null> {
    const program = await prisma.loyaltyProgram.findUnique({
      where: { id: programId },
      include: { brand: { select: { name: true } } },
    });
    if (!program) return null;

    const locations = includeLocations
      ? await prisma.merchant.findMany({
          where: { brandId: program.brandId, isActive: true, latitude: { not: null }, longitude: { not: null } },
          select: { latitude: true, longitude: true },
          orderBy: { createdAt: 'asc' },
          take: 10,
        })
      : [];

    return {
      programId,
      brandName: program.brand.name,
      card: toCardView(program),
      locations: locations.map((l) => ({ latitude: l.latitude!, longitude: l.longitude! })),
    };
  }

  /**
   * Helper privado para armar el contrato PassData.
   * El saldo (sellos activos y próximo vencimiento) es único del pase y no depende de la
   * promoción: la promoción solo define la meta y el premio que se muestran en la tarjeta (la
   * indicada en explicitPromotionId o, si no, la meta alcanzada o más próxima alcanzable).
   */
  private async buildPassData(
    pass: PassWithBrandAndCustomer,
    explicitPromotionId?: string,
    tx?: Prisma.TransactionClient,
    includeLocations = false,
  ): Promise<PassData | null> {
    const prisma = tx ?? this.prisma;
    const cardClass = await this.cardClassData(prisma, pass.programId, includeLocations);
    if (!cardClass) return null;
    const now = new Date();
    const [activeStamps, activePoints] = await Promise.all([
      prisma.stamp.count({
        where: {
          passId: pass.id,
          consumedAt: null,
          currency: 'STAMPS',
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      prisma.stamp.count({
        where: {
          passId: pass.id,
          consumedAt: null,
          currency: 'POINTS',
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
    ]);

    let promotion: any = null;
    const activePromotions = prisma.promotion.findMany
      ? explicitPromotionId
        ? await prisma.promotion.findMany({
            where: { id: explicitPromotionId, programId: pass.programId, isActive: true },
          })
        : await prisma.promotion.findMany({
            where: { programId: pass.programId, isActive: true },
            orderBy: { targetStamps: 'asc' },
          })
      : [];

    if (activePromotions && activePromotions.length > 0) {
      const reachedPromotions = activePromotions.filter((p) => activeStamps >= p.targetStamps);
      promotion =
        reachedPromotions.length > 0
          ? reachedPromotions[reachedPromotions.length - 1]
          : activePromotions[0];
    } else if (prisma.promotion.findFirst) {
      promotion = explicitPromotionId
        ? await prisma.promotion.findFirst({
            where: { id: explicitPromotionId, programId: pass.programId, isActive: true },
          })
        : await prisma.promotion.findFirst({
            where: { programId: pass.programId, isActive: true },
            orderBy: { createdAt: 'desc' },
          });
    }

    if (!promotion) return null;

    const nextExpiring = await prisma.stamp.findFirst({
      where: {
        passId: pass.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: 'asc' },
      select: { expiresAt: true },
    });

    return {
      passId: pass.id,
      serialNumber: pass.id,
      passToken: pass.passToken,
      programId: pass.programId,
      merchantName: pass.brand.name,
      customerLabel: passCustomerLabel(pass.customer),
      stampsEnabled: cardClass.card.stampsEnabled,
      pointsEnabled: cardClass.card.pointsEnabled,
      activeStamps,
      activePoints,
      targetStamps: promotion.targetStamps,
      rewardName: promotion.rewardName,
      nextExpiryAt: nextExpiring?.expiresAt ?? null,
      memberSince: pass.createdAt,
      cardExpiresAt: passExpiresAt(cardClass.card, pass.createdAt),
      cardClass,
    };
  }
}
