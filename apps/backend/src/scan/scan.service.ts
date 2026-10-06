import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  DEFAULT_OWNER_MAX_STAMPS,
  DEFAULT_PESOS_PER_POINT,
  POINTS_PER_SCAN_MAX,
  balanceUnit,
  firstName,
  pointsForAmount,
  type PanelStampsResultDto,
} from '@fidelity/shared';
import type { Customer, LoyaltyProgram, Pass, Promotion, Scan } from '@prisma/client';
import { MerchantRole, ScanMethod, ScanType } from '@prisma/client';
import { passExpiresAt, toCardView, type CardView } from '../cards/card-program.js';
import {
  assertLocationOperational,
  findBrandProgram,
  locationWithBrandSelect,
  requireActiveBrandOwner,
  resolveLocationAccess,
  type Db,
  type LocationWithBrand,
} from '../common/access/brand-access.js';
import { recordAudit } from '../common/audit/audit.js';
import { sanitizeImage, type UploadedImage, type ValidatedImage } from '../common/storage/image.js';
import { CHILE_TIME_ZONE, chileDay, nextChileMidnight } from '../common/utils/chile-time.js';
import { normalizeEmail } from '../common/utils/email.util.js';
import { maskEmail, maskPhone, maskRut } from '../common/utils/mask.util.js';
import { normalizePhone } from '../common/utils/phone.util.js';
import { cleanRut, validateRut } from '../common/utils/rut.util.js';
import { ConfigService } from '@nestjs/config';
import { PassesService } from '../passes/passes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PanelStampsDto } from '../customers/dto/panel-stamps.dto.js';
import {
  MaskedCustomerDto,
  PromotionOptionDto,
  ScanActionDto,
  ScanActionType,
  ScanResultDto,
  ScanValidateDto,
  ScanValidationDto,
} from './dto/scan-action.dto.js';
import { ManualLookupLimiter } from './manual-lookup-limiter.js';
import { ReceiptStorageService } from './receipt-storage.service.js';
import { ScanValidationTokens } from './validation-token.js';

// Canje: evita el doble toque del cajero sobre el botón de canjear.
export const REDEEM_DUPLICATE_WINDOW_MS = 90 * 1000; // 90 seconds
export const VISIT_REDEMPTION_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 horas

// Sellos: tras sumar un sello (por QR o ingreso manual), el pase queda bloqueado para sumar
// otro durante este tiempo. Evita que un mismo cliente acumule varios sellos en una visita.
export const DEFAULT_STAMP_COOLDOWN_MINUTES = 30;

// Puntos: el monto de cada compra da sus puntos y un cliente puede comprar dos veces seguidas.
// Solo se frena el doble envío de la misma compra.
export const POINTS_DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

/**
 * Convierte STAMP_COOLDOWN_MINUTES a milisegundos. Función pura: sin valor por defecto
 * tomado del entorno, para que el resultado dependa solo del argumento (y los tests no
 * cambien según el .env de quien los corre). Vacío, inválido o negativo → 30 min; 0 lo desactiva.
 */
export function resolveStampCooldownMs(raw: string | undefined): number {
  const minutes = raw === undefined || raw.trim() === '' ? NaN : Number(raw);
  const safeMinutes =
    Number.isFinite(minutes) && minutes >= 0 ? minutes : DEFAULT_STAMP_COOLDOWN_MINUTES;
  return safeMinutes * 60 * 1000;
}

/** OWNER_MAX_STAMPS_PER_LOAD: entero positivo; vacío o inválido → 10. */
export function resolveOwnerMaxStamps(raw: string | undefined): number {
  const value = raw === undefined || raw.trim() === '' ? NaN : Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : DEFAULT_OWNER_MAX_STAMPS;
}

type PassWithRelations = Pass & {
  customer: Customer | null;
};

/** La tarjeta de la marca y lo que vale cada punto. */
interface BrandCard {
  program: LoyaltyProgram;
  card: CardView;
  pesosPerPoint: number;
}

interface ScanContext extends BrandCard {
  merchant: LocationWithBrand;
}

type StampSource = 'SCANNER' | 'PANEL';

interface ResolvedTarget {
  pass: PassWithRelations;
  method: ScanMethod;
}

/** Lo que puede acompañar una carga de sellos, venga del escáner o del panel. */
interface StampInput {
  stampCount?: number;
  reason?: string;
  purchaseAmount?: number;
  note?: string;
}

interface StampOptions {
  stampCount: number;
  pointsEarned: number;
  isOwner: boolean;
  reason?: string;
  purchaseAmount?: number;
  note?: string;
  receipt: { path: string; image: ValidatedImage } | null;
}

interface StampResponseContext {
  passId: string;
  card: CardView;
  promotions: Promotion[];
  customer: MaskedCustomerDto | undefined;
  options: StampOptions;
  scan: Pick<Scan, 'id' | 'method'>;
  now: Date;
  block?: { until: Date; scan: Scan; cause: 'STAMP' | 'POINTS' };
}

type Tx = Db;

const RECEIPT_LABEL = { label: 'La foto de la boleta', fallbackName: 'boleta' };

const clp = new Intl.NumberFormat('es-CL');

/** Sellos que cuentan en el saldo: no consumidos y no vencidos, de cualquier promoción. */
const activeStampsWhere = (passId: string, now: Date) => ({
  passId,
  consumedAt: null,
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

/** Promociones activas del comercio con la indicación de si el saldo alcanza para cada una. */
const toPromotionOptions = (
  promotions: Promotion[],
  activeStamps: number,
  activePoints: number,
): PromotionOptionDto[] =>
  promotions.map((p) => ({
    id: p.id,
    name: p.name,
    rewardName: p.rewardName,
    targetStamps: p.targetStamps,
    currency: p.currency,
    canRedeem: p.currency === 'POINTS' ? activePoints >= p.targetStamps : activeStamps >= p.targetStamps,
  }));

/** Lo que ve la caja: el primer nombre y los identificadores enmascarados, nunca el id interno. */
function toCashierCustomer(customer: Customer | null): MaskedCustomerDto | undefined {
  if (!customer) return undefined;
  return {
    firstName: firstName(customer.name),
    rut: customer.rut ? maskRut(customer.rut) : null,
    phone: customer.phone ? maskPhone(customer.phone) : null,
    email: customer.email ? maskEmail(customer.email) : null,
  };
}

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);
  private readonly stampCooldownMs: number;
  private readonly ownerMaxStamps: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passesService: PassesService,
    configService: ConfigService,
    private readonly manualLookupLimiter: ManualLookupLimiter,
    private readonly receipts: ReceiptStorageService,
    private readonly validationTokens: ScanValidationTokens,
  ) {
    this.stampCooldownMs = resolveStampCooldownMs(
      configService.get<string>('STAMP_COOLDOWN_MINUTES'),
    );
    this.ownerMaxStamps = resolveOwnerMaxStamps(
      configService.get<string>('OWNER_MAX_STAMPS_PER_LOAD'),
    );
  }

  /**
   * Primer paso en caja: identifica al cliente y muestra su saldo sin sumar nada. Devuelve el
   * comprobante con el que luego se suma el sello o se canjea.
   */
  async validate(dto: ScanValidateDto, callerUserId: string): Promise<ScanValidationDto> {
    if (!callerUserId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const { merchant, membership } = await resolveLocationAccess(
      this.prisma,
      callerUserId,
      dto.merchantId,
    );

    // Mismo orden que processScan: el límite va después de validar la membresía.
    if (!dto.passToken) {
      this.manualLookupLimiter.consume(callerUserId);
    }

    const brandCard = await this.requireActiveProgram(merchant.brandId);
    const { program, card } = brandCard;
    const pass = await this.resolvePass(dto, program);
    const now = new Date();
    this.assertCardValid(card, pass, now);
    const activePromotions = await this.findActivePromotions(program.id);
    const featured = activePromotions[0];
    const method: ScanMethod = dto.passToken ? ScanMethod.QR : ScanMethod.MANUAL;

    const { activeStamps, activePoints, nextExpiryAt } = await this.readBalance(this.prisma, pass.id, now);
    const { latestStamp, latestPoints } = await this.findLatestScans(this.prisma, pass.id);
    const stampBlock = this.cooldownUntil(card, latestStamp, null, now);
    const pointsBlock = this.cooldownUntil(card, null, latestPoints, now);
    const availablePromotions = toPromotionOptions(activePromotions, activeStamps, activePoints);
    const isOwner = membership.role === MerchantRole.OWNER;

    const { token, expiresAt } = this.validationTokens.sign({
      passId: pass.id,
      method,
      userId: callerUserId,
      merchantId: merchant.id,
    });

    return {
      validationToken: token,
      expiresAt,
      method,
      passId: pass.id,
      customer: toCashierCustomer(pass.customer) ?? {},
      activeStamps,
      activePoints,
      targetStamps: featured.targetStamps,
      rewardName: featured.rewardName,
      rewardUnlocked: availablePromotions.some((p) => p.canRedeem),
      availablePromotions,
      nextExpiryAt,
      nextStampAvailableAt: stampBlock?.until ?? null,
      canStamp: isOwner || stampBlock === null,
      maxStampsPerLoad: isOwner && card.type === 'STAMPS' ? this.ownerMaxStamps : 1,
      reasonRequired: isOwner && stampBlock !== null,
      nextPointsAvailableAt: pointsBlock?.until ?? null,
      canAddPoints: isOwner || pointsBlock === null,
      pointsReasonRequired: isOwner && pointsBlock !== null,
      cardType: card.type,
      stampsEnabled: card.stampsEnabled,
      pointsEnabled: card.pointsEnabled,
      pesosPerPoint: brandCard.pesosPerPoint,
      amountRequired: card.pointsEnabled,
      receiptRequired: card.pointsEnabled && !isOwner,
    };
  }

  async processScan(
    dto: ScanActionDto,
    callerUserId: string,
    receiptFile?: UploadedImage,
  ): Promise<ScanResultDto> {
    if (!callerUserId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const { merchant, membership } = await resolveLocationAccess(
      this.prisma,
      callerUserId,
      dto.merchantId,
    );

    // El límite va después de validar la membresía (un extraño no consume el cupo de nadie) y
    // antes de buscar (el intento cuenta aunque el RUT no exista: eso es justo lo que se frena).
    // Con comprobante la búsqueda ya se contó al validar.
    if (!dto.passToken && !dto.validationToken) {
      this.manualLookupLimiter.consume(callerUserId);
    }

    const brandCard = await this.requireActiveProgram(merchant.brandId);
    const { program } = brandCard;
    const context: ScanContext = { merchant, ...brandCard };
    const { pass, method } = await this.resolveTarget(dto, program, callerUserId);
    this.assertCardValid(brandCard.card, pass, new Date());

    // Los sellos son un saldo único del pase: cualquier sello vigente sirve para cualquier
    // promoción activa. La más reciente es la "de referencia" (la que muestran landing y pase).
    const activePromotions = await this.findActivePromotions(program.id);
    const maskedCustomer = toCashierCustomer(pass.customer);

    if (dto.action === ScanActionType.STAMP) {
      const options = await this.buildStampOptions(
        dto,
        membership.role === MerchantRole.OWNER,
        context,
        pass.id,
        receiptFile,
        'SCANNER',
      );
      const result = await this.executeStampAction(
        pass,
        context,
        activePromotions,
        callerUserId,
        maskedCustomer,
        method,
        options,
      );
      if (!result.alreadyScanned) {
        void this.passesService
          .notifyPassUpdate(pass.id)
          .catch((err) =>
            this.logger.warn(`Error al notificar actualización de pase en segundo plano: ${err}`),
          );
      }
      return result;
    }

    if (dto.action === ScanActionType.REDEEM) {
      if (receiptFile) {
        throw new BadRequestException(
          `La foto de la boleta solo se adjunta al sumar ${balanceUnit(brandCard.card.type)}`,
        );
      }
      const chosen = this.resolveRedeemPromotion(activePromotions, dto.promotionId);
      const result = await this.executeRedeemAction(
        pass,
        context,
        chosen,
        activePromotions,
        callerUserId,
        maskedCustomer,
        method,
      );
      if (!result.alreadyScanned) {
        void this.passesService
          .notifyPassUpdate(pass.id)
          .catch((err) =>
            this.logger.warn(`Error al notificar actualización de pase en segundo plano: ${err}`),
          );
      }
      return result;
    }

    const unsupportedAction = String(dto.action);
    throw new BadRequestException(`Acción de escaneo no soportada: ${unsupportedAction}`);
  }

  /**
   * El dueño suma sellos desde la ficha del cliente, sin escanear en caja. El cliente no está
   * presente, así que el motivo es siempre obligatorio y queda en AuditLog (§8.5). Pasa por la
   * misma transacción que el escáner: queda en el historial con método PANEL.
   */
  async addStampsFromPanel(
    customerId: string,
    dto: PanelStampsDto,
    callerUserId: string,
    receiptFile?: UploadedImage,
  ): Promise<PanelStampsResultDto> {
    await requireActiveBrandOwner(this.prisma, callerUserId, dto.brandId);
    const brandCard = await this.requireActiveProgram(dto.brandId);
    const { program } = brandCard;

    const pass = await this.prisma.pass.findUnique({
      where: { customerId_programId: { customerId, programId: program.id } },
      include: { customer: true },
    });
    if (!pass) {
      throw new NotFoundException('El cliente no tiene una tarjeta en esta marca');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: dto.merchantId ?? pass.merchantId },
      select: locationWithBrandSelect,
    });
    if (!merchant || merchant.brandId !== dto.brandId) {
      throw new ForbiddenException('El local no pertenece a tu marca');
    }
    assertLocationOperational(merchant);
    this.assertCardValid(brandCard.card, pass, new Date());

    const context: ScanContext = { merchant, ...brandCard };
    const activePromotions = await this.findActivePromotions(program.id);
    const options = await this.buildStampOptions(dto, true, context, pass.id, receiptFile, 'PANEL');
    const result = await this.executeStampAction(
      pass,
      context,
      activePromotions,
      callerUserId,
      toCashierCustomer(pass.customer),
      ScanMethod.PANEL,
      options,
    );
    void this.passesService
      .notifyPassUpdate(pass.id)
      .catch((err) =>
        this.logger.warn(`Error al notificar actualización de pase desde panel: ${err}`),
      );

    return {
      scanId: result.scanId!,
      stampsAdded: result.stampsAdded ?? options.stampCount,
      activeStamps: result.activeStamps,
      rewardUnlocked: result.rewardUnlocked,
    };
  }

  private async requireActiveProgram(brandId: string): Promise<BrandCard> {
    const program = await findBrandProgram(this.prisma, brandId);
    if (!program || !program.isActive) {
      throw new BadRequestException('El comercio no tiene una promoción activa válida');
    }
    const card = toCardView(program);
    const brand =
      card.type === 'POINTS'
        ? await this.prisma.brand.findUnique({ where: { id: brandId }, select: { pesosPerPoint: true } })
        : null;
    return { program, card, pesosPerPoint: brand?.pesosPerPoint ?? DEFAULT_PESOS_PER_POINT };
  }

  /** Una tarjeta vencida (término fijo o plazo tras obtenerla) no suma ni canjea. */
  private assertCardValid(card: CardView, pass: Pick<Pass, 'createdAt'>, now: Date): void {
    const expiresAt = passExpiresAt(card, pass.createdAt);
    if (expiresAt && expiresAt.getTime() <= now.getTime()) {
      throw new BadRequestException(
        `La tarjeta de este cliente venció el ${expiresAt.toLocaleDateString('es-CL', { timeZone: CHILE_TIME_ZONE })}`,
      );
    }
  }

  private async findActivePromotions(programId: string): Promise<Promotion[]> {
    const activePromotions = await this.prisma.promotion.findMany({
      where: { programId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (activePromotions.length === 0) {
      throw new BadRequestException('El comercio no tiene una promoción activa válida');
    }
    return activePromotions;
  }

  /**
   * Sellos. STAFF: siempre 1 y con el bloqueo entre sellos. OWNER: hasta ownerMaxStamps por
   * carga; varios exigen motivo (queda en AuditLog).
   * Puntos. En caja salen del monto, y el STAFF debe adjuntar la boleta: sin ella podría inflar
   * el monto. Desde el panel el dueño indica los puntos directamente, con motivo.
   * La foto se valida y recodifica antes de abrir la transacción.
   */
  private async buildStampOptions(
    dto: StampInput,
    isOwner: boolean,
    context: ScanContext,
    passId: string,
    receiptFile: UploadedImage | undefined,
    source: StampSource,
  ): Promise<StampOptions> {
    const stampCount = context.card.stampsEnabled ? this.stampsToAdd(dto, isOwner) : 0;
    const pointsEarned = context.card.pointsEnabled 
        ? this.pointsToAdd(dto, isOwner, context.pesosPerPoint, receiptFile, source, context.card.stampsEnabled) 
        : 0;

    if (stampCount === 0 && pointsEarned === 0) {
      throw new BadRequestException('El programa no tiene sellos ni puntos habilitados.');
    }

    const brandId = context.merchant.brandId;

    const image = receiptFile ? await sanitizeImage(receiptFile, RECEIPT_LABEL) : null;

    return {
      stampCount,
      pointsEarned,
      isOwner,
      reason: isOwner ? dto.reason : undefined,
      purchaseAmount: dto.purchaseAmount,
      note: dto.note,
      receipt: image
        ? { path: `${brandId}/${passId}/${randomUUID()}.${image.extension}`, image }
        : null,
    };
  }

  private stampsToAdd(dto: StampInput, isOwner: boolean): number {
    const stampCount = dto.stampCount ?? 1;
    if (stampCount === 0) return 0;
    if (!isOwner && stampCount !== 1) {
      throw new ForbiddenException('Solo el dueño puede cargar varios sellos de una vez');
    }
    if (stampCount > this.ownerMaxStamps) {
      throw new BadRequestException(
        `Puedes cargar hasta ${this.ownerMaxStamps} sellos de una vez`,
      );
    }
    if (stampCount > 1 && !dto.reason) {
      throw new BadRequestException('Indica el motivo para cargar varios sellos');
    }
    return stampCount;
  }

  private pointsToAdd(
    dto: StampInput,
    isOwner: boolean,
    pesosPerPoint: number,
    receiptFile: UploadedImage | undefined,
    source: StampSource,
    stampsEnabled: boolean,
  ): number {
    const tooMany = `Puedes sumar hasta ${clp.format(POINTS_PER_SCAN_MAX)} puntos de una vez`;
    if (source === 'PANEL') {
      const points = dto.stampCount ?? 0;
      if (points > POINTS_PER_SCAN_MAX) throw new BadRequestException(tooMany);
      return points;
    }

    if (dto.purchaseAmount === undefined) {
      if (stampsEnabled) return 0;
      throw new BadRequestException('Ingresa el monto de la compra: con él se calculan los puntos');
    }
    if (!isOwner && !receiptFile) {
      throw new BadRequestException('Adjunta la foto de la boleta: es obligatoria para sumar puntos');
    }
    const points = pointsForAmount(dto.purchaseAmount, pesosPerPoint);
    if (points < 1) {
      throw new BadRequestException(
        `El monto no alcanza para un punto (1 punto cada $${clp.format(pesosPerPoint)})`,
      );
    }
    if (points > POINTS_PER_SCAN_MAX) throw new BadRequestException(tooMany);
    return points;
  }

  /**
   * La promoción del canje la elige el cliente. Con una sola activa no hace falta indicarla;
   * con varias es obligatoria, para no canjear algo que el cliente no pidió.
   */
  private resolveRedeemPromotion(activePromotions: Promotion[], promotionId?: string): Promotion {
    if (promotionId) {
      const chosen = activePromotions.find((p) => p.id === promotionId);
      if (!chosen) {
        throw new BadRequestException(
          'La promoción especificada no existe o no está activa en este comercio',
        );
      }
      return chosen;
    }

    if (activePromotions.length > 1) {
      throw new BadRequestException(
        'El comercio tiene varias promociones activas: indique en promotionId cuál eligió canjear el cliente.',
      );
    }

    return activePromotions[0];
  }

  /** Con comprobante, el pase y el método salen de la validación; sin él, del QR o la búsqueda. */
  private async resolveTarget(
    dto: ScanActionDto,
    program: LoyaltyProgram,
    callerUserId: string,
  ): Promise<ResolvedTarget> {
    if (dto.validationToken) {
      const claims = this.validationTokens.verify(dto.validationToken, {
        userId: callerUserId,
        merchantId: dto.merchantId,
      });
      const pass = await this.prisma.pass.findUnique({
        where: { id: claims.passId },
        include: { customer: true },
      });
      if (!pass) {
        throw new NotFoundException('El cliente ya no tiene una tarjeta en este comercio');
      }
      if (pass.programId !== program.id) {
        throw new ForbiddenException('El pase no pertenece a este comercio');
      }
      return { pass, method: claims.method };
    }

    const pass = await this.resolvePass(dto, program);
    return { pass, method: dto.passToken ? ScanMethod.QR : ScanMethod.MANUAL };
  }

  /**
   * Resuelve el pase a partir del QR (passToken) o, en el ingreso manual, del RUT, teléfono o
   * correo del cliente. Solo valen pases del programa de la marca del local.
   */
  private async resolvePass(
    dto: Pick<ScanValidateDto, 'passToken' | 'customer'>,
    program: LoyaltyProgram,
  ): Promise<PassWithRelations> {
    const include = { customer: true } as const;

    if (dto.passToken) {
      const pass = await this.prisma.pass.findUnique({
        where: { passToken: dto.passToken },
        include,
      });

      if (!pass) {
        throw new NotFoundException('No se encontró un pase para el token proporcionado');
      }

      if (pass.programId !== program.id) {
        throw new ForbiddenException('El pase no pertenece a este comercio');
      }

      return pass;
    }

    const rawRut = dto.customer?.rut?.trim();
    const rawPhone = dto.customer?.phone?.trim();
    const rawEmail = dto.customer?.email?.trim();
    let customerWhere: { rut: string } | { phone: string } | { email: string };

    if (rawRut) {
      if (!validateRut(rawRut)) {
        throw new BadRequestException('El RUT ingresado no es válido');
      }
      customerWhere = { rut: cleanRut(rawRut) };
    } else if (rawPhone) {
      const phone = normalizePhone(rawPhone);
      if (!phone) {
        throw new BadRequestException('El teléfono ingresado no es un celular chileno válido');
      }
      customerWhere = { phone };
    } else if (rawEmail) {
      const email = normalizeEmail(rawEmail);
      if (!email) {
        throw new BadRequestException('El correo ingresado no es válido');
      }
      customerWhere = { email };
    } else {
      throw new BadRequestException(
        'Debe escanear el QR del pase o ingresar el RUT, el teléfono o el correo del cliente',
      );
    }

    const pass = await this.prisma.pass.findFirst({
      where: { programId: program.id, customer: customerWhere },
      include,
    });

    if (!pass) {
      throw new NotFoundException('El cliente no tiene una tarjeta en este comercio');
    }

    return pass;
  }

  /** Saldo del pase (todas las promociones) y su próximo vencimiento. */
  private async readBalance(
    db: Tx,
    passId: string,
    now: Date,
  ): Promise<{ activeStamps: number; activePoints: number; nextExpiryAt: Date | null }> {
    const [activeStamps, activePoints, nextExpiring] = await Promise.all([
      db.stamp.count({ where: { ...activeStampsWhere(passId, now), currency: 'STAMPS' } }),
      db.stamp.count({ where: { ...activeStampsWhere(passId, now), currency: 'POINTS' } }),
      db.stamp.findFirst({
        where: { passId, consumedAt: null, expiresAt: { gt: now } },
        orderBy: { expiresAt: 'asc' },
        select: { expiresAt: true },
      }),
    ]);
    
    return { activeStamps, activePoints, nextExpiryAt: nextExpiring?.expiresAt ?? null };
  }

  private async findLatestScans(db: Tx, passId: string): Promise<{ latestStamp: Scan | null; latestPoints: Scan | null }> {
    // El saldo de bienvenida no es una visita: no bloquea el primer sello en caja.
    const [latestStamp, latestPoints] = await Promise.all([
      db.scan.findFirst({
        where: { passId, type: ScanType.STAMP_ADDED, method: { not: ScanMethod.WELCOME }, stampCount: { gt: 0 } },
        orderBy: { createdAt: 'desc' },
      }),
      db.scan.findFirst({
        where: { passId, type: ScanType.STAMP_ADDED, method: { not: ScanMethod.WELCOME }, pointsEarned: { gt: 0 } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { latestStamp, latestPoints };
  }

  /**
   * null si el pase puede sumar ya; si no, desde cuándo podrá y el scan que causó el bloqueo.
   * Sellos con límite diario: uno por día calendario de Chile. Sin límite: STAMP_COOLDOWN_MINUTES. Puntos: solo el doble envío.
   */
  private cooldownUntil(card: CardView, latestStamp: Scan | null, latestPoints: Scan | null, now: Date): { until: Date; scan: Scan; cause: 'STAMP' | 'POINTS' } | null {
    const blocks: { until: Date; scan: Scan; cause: 'STAMP' | 'POINTS' }[] = [];
    
    if (card.stampsEnabled && latestStamp) {
      if (card.dailyStampLimit) {
        const midnight = chileDay(latestStamp.createdAt) === chileDay(now) ? nextChileMidnight(now) : null;
        if (midnight) blocks.push({ until: midnight, scan: latestStamp, cause: 'STAMP' });
      } else if (this.stampCooldownMs > 0) {
        blocks.push({ until: new Date(latestStamp.createdAt.getTime() + this.stampCooldownMs), scan: latestStamp, cause: 'STAMP' });
      }
    }

    if (card.pointsEnabled && latestPoints && POINTS_DUPLICATE_WINDOW_MS > 0) {
      blocks.push({ until: new Date(latestPoints.createdAt.getTime() + POINTS_DUPLICATE_WINDOW_MS), scan: latestPoints, cause: 'POINTS' });
    }

    const futureBlocks = blocks.filter((b) => b.until.getTime() > now.getTime());
    if (futureBlocks.length === 0) return null;
    
    return futureBlocks.reduce((max, b) => (b.until.getTime() > max.until.getTime() ? b : max), futureBlocks[0]);
  }

  private blockedMessage(card: CardView, isOwner: boolean, block: { until: Date; cause: 'STAMP' | 'POINTS' }, now: Date): string {
    const minutesLeft = Math.max(1, Math.ceil((block.until.getTime() - now.getTime()) / 60000));
    
    if (block.cause === 'STAMP') {
      if (card.dailyStampLimit && minutesLeft > 180) {
        return isOwner
          ? 'Este cliente ya alcanzó el límite diario de sellos. Para sumar más indica el motivo'
          : 'Este cliente ya alcanzó el límite diario de sellos. Podrá sumar más mañana';
      }
      return isOwner
        ? `Este escaneo parece repetido. Para sumar de nuevo antes de ${minutesLeft} min indica el motivo`
        : `Este escaneo parece repetido. Espera ${minutesLeft} min`;
    }
    
    return isOwner
      ? `Esta compra parece repetida: se sumaron puntos hace un momento. Para sumar de nuevo antes de ${minutesLeft} min indica el motivo`
      : `Esta compra parece repetida: se sumaron puntos hace un momento. Espera ${minutesLeft} min`;
  }

  private async executeStampAction(
    pass: PassWithRelations,
    context: ScanContext,
    activePromotions: Promotion[],
    callerUserId: string,
    maskedCustomer: MaskedCustomerDto | undefined,
    method: ScanMethod,
    options: StampOptions,
  ): Promise<ScanResultDto> {
    const { receipt } = options;
    const upload = receipt
      ? { path: receipt.path, buffer: receipt.image.buffer, contentType: receipt.image.mimeType }
      : null;

    const result = await this.receipts.uploadThen(upload, () =>
      this.stampInTransaction(
        pass,
        context,
        activePromotions,
        callerUserId,
        maskedCustomer,
        method,
        options,
      ),
    );

    // Bloqueado por el tiempo entre sellos: no hubo scan al que asociar la foto.
    if (result.alreadyScanned && upload) {
      await this.receipts.remove([upload.path]);
    }
    return result;
  }

  private stampInTransaction(
    pass: PassWithRelations,
    { merchant, program, card }: ScanContext,
    activePromotions: Promotion[],
    callerUserId: string,
    maskedCustomer: MaskedCustomerDto | undefined,
    method: ScanMethod,
    options: StampOptions,
  ): Promise<ScanResultDto> {
    return this.prisma.$transaction(async (tx) => {
      // Bloqueo pesimista de fila en Pass para serializar operaciones sobre el mismo pase
      await tx.$queryRaw`SELECT id FROM "Pass" WHERE id = ${pass.id}::uuid FOR UPDATE`;

      // "now" se toma DESPUÉS del lock: si se tomara antes, el que esperó el lock compararía
      // contra un sello creado "en el futuro" (diferencia negativa) y quedaría bloqueado aunque
      // el cooldown fuera 0.
      const now = new Date();
      const expiresAt =
        program.stampValidityDays && program.stampValidityDays > 0
          ? new Date(now.getTime() + program.stampValidityDays * 24 * 60 * 60 * 1000)
          : null;

      // Bloqueo por pase: un sello cada stampCooldownMs. Se evalúa dentro del lock de fila,
      // así que dos cajeros escaneando a la vez no pueden colar un segundo sello. Es por marca:
      // sellar en un local también bloquea sellar en otro. El OWNER lo puede saltar dando motivo.
      const { latestStamp, latestPoints } = await this.findLatestScans(tx, pass.id);
      const block = this.cooldownUntil(
        card,
        options.stampCount > 0 ? latestStamp : null,
        options.pointsEarned > 0 ? latestPoints : null,
        now,
      );
      const overridesCooldown = block !== null && options.isOwner && !!options.reason;
      const responseContext = { passId: pass.id, card, promotions: activePromotions, customer: maskedCustomer, options, now };

      if (block && !overridesCooldown) {
        return this.stampResponse(tx, { ...responseContext, scan: block.scan, block });
      }

      // brandId y programId los vuelve a fijar el trigger ledger_derive_from_pass.
      const scan = await tx.scan.create({
        data: {
          passId: pass.id,
          merchantId: merchant.id,
          brandId: merchant.brandId,
          programId: program.id,
          type: ScanType.STAMP_ADDED,
          createdByUserId: callerUserId,
          method,
          stampCount: options.stampCount,
          pointsEarned: options.pointsEarned,
          purchaseAmount: options.purchaseAmount ?? null,
          note: options.note ?? null,
        },
      });

      const stampData = [];
      if (options.stampCount > 0) {
        stampData.push(
          ...Array.from({ length: options.stampCount }, () => ({
            passId: pass.id,
            merchantId: merchant.id,
            brandId: merchant.brandId,
            programId: program.id,
            sourceScanId: scan.id,
            createdByUserId: callerUserId,
            earnedAt: now,
            expiresAt,
            currency: 'STAMPS' as const,
          }))
        );
      }
      if (options.pointsEarned > 0) {
        stampData.push(
          ...Array.from({ length: options.pointsEarned }, () => ({
            passId: pass.id,
            merchantId: merchant.id,
            brandId: merchant.brandId,
            programId: program.id,
            sourceScanId: scan.id,
            createdByUserId: callerUserId,
            earnedAt: now,
            expiresAt,
            currency: 'POINTS' as const,
          }))
        );
      }

      if (stampData.length > 0) {
        await tx.stamp.createMany({ data: stampData });
      }

      if (options.receipt) {
        await tx.scanReceipt.create({
          data: {
            scanId: scan.id,
            storagePath: options.receipt.path,
            mimeType: options.receipt.image.mimeType,
            sizeBytes: options.receipt.image.sizeBytes,
            uploadedByUserId: callerUserId,
          },
        });
      }

      const createdScan = { id: scan.id, method };
      await this.auditOwnerStamp(tx, { passId: pass.id, merchantId: merchant.id, callerUserId, scan: createdScan, options, overridesCooldown });
      await this.passesService.enqueuePassUpdate(pass.id, tx);
      return this.stampResponse(tx, { ...responseContext, scan: createdScan });
    });
  }

  private async auditOwnerStamp(
    tx: Tx,
    { passId, merchantId, callerUserId, scan, options, overridesCooldown }: {
      passId: string;
      merchantId: string;
      callerUserId: string;
      scan: Pick<Scan, 'id' | 'method'>;
      options: StampOptions;
      overridesCooldown: boolean;
    },
  ): Promise<void> {
    if (!options.isOwner || !options.reason) return;
    await recordAudit(tx, {
      actorUserId: callerUserId,
      actorType: 'OWNER',
      action: 'pass.stamps_added',
      entity: 'Pass',
      entityId: passId,
      after: { scanId: scan.id, merchantId, method: scan.method, stampCount: options.stampCount, overridesCooldown },
      reason: options.reason,
    });
  }

  private async stampResponse(
    tx: Tx,
    { passId, card, promotions, customer, options, scan, now, block }: StampResponseContext,
  ): Promise<ScanResultDto> {
    const featured = promotions[0];
    const { activeStamps, activePoints, nextExpiryAt } = await this.readBalance(tx, passId, now);
    const availablePromotions = toPromotionOptions(promotions, activeStamps, activePoints);
    const rewardUnlocked = availablePromotions.some((p) => p.canRedeem);
    const result = {
      success: true,
      action: ScanActionType.STAMP,
      method: scan.method,
      passId,
      activeStamps,
      activePoints,
      targetStamps: featured.targetStamps,
      rewardUnlocked,
      rewardName: featured.rewardName,
      availablePromotions,
      nextExpiryAt,
      scanId: scan.id,
      customer,
    };
    if (block) {
      return {
        ...result,
        alreadyScanned: true,
        nextStampAvailableAt: block.until,
        message: this.blockedMessage(card, options.isOwner, block, now),
      };
    }
    
    const msgParts = [];
    if (options.stampCount > 0) msgParts.push(`${options.stampCount} sello${options.stampCount === 1 ? '' : 's'}`);
    if (options.pointsEarned > 0) msgParts.push(`${clp.format(options.pointsEarned)} punto${options.pointsEarned === 1 ? '' : 's'}`);
    
    const isPlural = msgParts.length > 1 || options.stampCount > 1 || options.pointsEarned > 1;
    const added = `${msgParts.join(' y ')} agregado${isPlural ? 's' : ''}`;
    const balances = [];
    if (card.stampsEnabled) balances.push(`${activeStamps} sellos`);
    if (card.pointsEnabled) balances.push(`${clp.format(activePoints)} puntos`);
    const balanceStr = balances.join(' / ');

    return {
      ...result,
      alreadyScanned: false,
      stampsAdded: options.stampCount,
      pointsAdded: options.pointsEarned,
      message: rewardUnlocked
        ? `¡${added}! El cliente ya puede canjear un premio (${balanceStr})`
        : `${added} exitosamente (${balanceStr})`,
    };
  }

  private async executeRedeemAction(
    pass: PassWithRelations,
    { merchant, program }: ScanContext,
    promotion: Promotion,
    activePromotions: Promotion[],
    callerUserId: string,
    maskedCustomer: MaskedCustomerDto | undefined,
    method: ScanMethod,
  ): Promise<ScanResultDto> {
    return this.prisma.$transaction(async (tx) => {
      // Bloqueo pesimista de fila en Pass para serializar operaciones sobre el mismo pase
      await tx.$queryRaw`SELECT id FROM "Pass" WHERE id = ${pass.id}::uuid FOR UPDATE`;
      const now = new Date();

      // Ventana anti-duplicado de 90 s (doble toque) POR PROMOCIÓN. Si fuera por pase, canjear
      // A y enseguida B respondería "ya canjeado" con los datos de B sin consumir sellos, y la
      // caja mostraría "premio entregado": el cliente se llevaría B gratis.
      const latestRedeem = await tx.scan.findFirst({
        where: {
          passId: pass.id,
          type: ScanType.REWARD_REDEEMED,
          promotionId: promotion.id,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (latestRedeem && now.getTime() - latestRedeem.createdAt.getTime() < REDEEM_DUPLICATE_WINDOW_MS) {
        const { activeStamps, activePoints, nextExpiryAt } = await this.readBalance(tx, pass.id, now);
        const availablePromotions = toPromotionOptions(activePromotions, activeStamps, activePoints);

        return {
          success: true,
          alreadyScanned: true,
          action: ScanActionType.REDEEM,
          method: latestRedeem.method,
          passId: pass.id,
          activeStamps,
          activePoints,
          targetStamps: promotion.targetStamps,
          rewardUnlocked: availablePromotions.some((p) => p.canRedeem),
          rewardName: promotion.rewardName,
          availablePromotions,
          nextExpiryAt,
          scanId: latestRedeem.id,
          customer: maskedCustomer,
          message: 'El canje ya fue procesado en los últimos 90 segundos',
        };
      }

      if (!program.allowMultipleRedemptionsPerVisit) {
        const anyRecentRedeem = await tx.scan.findFirst({
          where: {
            passId: pass.id,
            type: ScanType.REWARD_REDEEMED,
            createdAt: { gt: new Date(now.getTime() - VISIT_REDEMPTION_WINDOW_MS) }
          }
        });
        if (anyRecentRedeem) {
          throw new BadRequestException('Solo se permite canjear un premio por visita.');
        }
      }

      // FIFO sobre el saldo completo de la moneda seleccionada.
      const activeStampsList = await tx.stamp.findMany({
        where: { ...activeStampsWhere(pass.id, now), currency: promotion.currency },
        orderBy: { earnedAt: 'asc' },
      });

      if (activeStampsList.length < promotion.targetStamps) {
        const unit = promotion.currency === 'POINTS' ? 'Puntos' : 'Sellos';
        throw new BadRequestException(
          `${unit} activos insuficientes para canjear "${promotion.name}". Tiene ${activeStampsList.length}, requiere ${promotion.targetStamps}`,
        );
      }

      const scan = await tx.scan.create({
        data: {
          passId: pass.id,
          merchantId: merchant.id,
          brandId: merchant.brandId,
          programId: program.id,
          type: ScanType.REWARD_REDEEMED,
          promotionId: promotion.id,
          createdByUserId: callerUserId,
          method,
        },
      });

      const stampsToConsume = activeStampsList.slice(0, promotion.targetStamps);
      const stampIds = stampsToConsume.map((s) => s.id);

      const updateResult = await tx.stamp.updateMany({
        where: { id: { in: stampIds }, consumedAt: null },
        data: {
          consumedAt: now,
          consumedByScanId: scan.id,
        },
      });

      if (updateResult.count !== stampsToConsume.length) {
        throw new ConflictException(
          'Conflicto de concurrencia: parte de los sellos ya fueron consumidos por otra operación.',
        );
      }

      const { activeStamps, activePoints, nextExpiryAt } = await this.readBalance(tx, pass.id, now);
      const availablePromotions = toPromotionOptions(activePromotions, activeStamps, activePoints);

      await this.passesService.enqueuePassUpdate(pass.id, tx);

      return {
        success: true,
        alreadyScanned: false,
        action: ScanActionType.REDEEM,
        method,
        passId: pass.id,
        activeStamps,
        activePoints,
        targetStamps: promotion.targetStamps,
        rewardUnlocked: availablePromotions.some((p) => p.canRedeem),
        rewardName: promotion.rewardName,
        availablePromotions,
        nextExpiryAt,
        scanId: scan.id,
        consumedStampsCount: promotion.targetStamps,
        customer: maskedCustomer,
        message: `Premio "${promotion.rewardName}" canjeado exitosamente`,
      };
    });
  }
}
