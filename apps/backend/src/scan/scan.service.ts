import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DEFAULT_OWNER_MAX_STAMPS, firstName, type PanelStampsResultDto } from '@fidelity/shared';
import type { Customer, LoyaltyProgram, Pass, Promotion, Scan } from '@prisma/client';
import { MerchantRole, ScanMethod, ScanType } from '@prisma/client';
import {
  assertLocationOperational,
  findStampsProgram,
  locationWithBrandSelect,
  requireActiveBrandOwner,
  resolveLocationAccess,
  type Db,
  type LocationWithBrand,
} from '../common/access/brand-access.js';
import { recordAudit } from '../common/audit/audit.js';
import { sanitizeImage, type UploadedImage, type ValidatedImage } from '../common/storage/image.js';
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

// Sellos: tras sumar un sello (por QR o ingreso manual), el pase queda bloqueado para sumar
// otro durante este tiempo. Evita que un mismo cliente acumule varios sellos en una visita.
export const DEFAULT_STAMP_COOLDOWN_MINUTES = 30;

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

interface ScanContext {
  merchant: LocationWithBrand;
  program: LoyaltyProgram;
}

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
  isOwner: boolean;
  reason?: string;
  purchaseAmount?: number;
  note?: string;
  receipt: { path: string; image: ValidatedImage } | null;
}

type Tx = Db;

const RECEIPT_LABEL = { label: 'La foto de la boleta', fallbackName: 'boleta' };

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
): PromotionOptionDto[] =>
  promotions.map((p) => ({
    id: p.id,
    name: p.name,
    rewardName: p.rewardName,
    targetStamps: p.targetStamps,
    canRedeem: activeStamps >= p.targetStamps,
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

    const program = await this.requireActiveProgram(merchant.brandId);
    const pass = await this.resolvePass(dto, program);
    const activePromotions = await this.findActivePromotions(program.id);
    const featured = activePromotions[0];
    const method: ScanMethod = dto.passToken ? ScanMethod.QR : ScanMethod.MANUAL;

    const now = new Date();
    const { activeStamps, nextExpiryAt } = await this.readBalance(this.prisma, pass.id, now);
    const latestStamp = await this.findLatestStamp(this.prisma, pass.id);
    const nextStampAvailableAt = this.cooldownUntil(latestStamp, now);
    const availablePromotions = toPromotionOptions(activePromotions, activeStamps);
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
      targetStamps: featured.targetStamps,
      rewardName: featured.rewardName,
      rewardUnlocked: availablePromotions.some((p) => p.canRedeem),
      availablePromotions,
      nextExpiryAt,
      nextStampAvailableAt,
      canStamp: isOwner || nextStampAvailableAt === null,
      maxStampsPerLoad: isOwner ? this.ownerMaxStamps : 1,
      reasonRequired: isOwner && nextStampAvailableAt !== null,
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

    const program = await this.requireActiveProgram(merchant.brandId);
    const context: ScanContext = { merchant, program };
    const { pass, method } = await this.resolveTarget(dto, program, callerUserId);

    // Los sellos son un saldo único del pase: cualquier sello vigente sirve para cualquier
    // promoción activa. La más reciente es la "de referencia" (la que muestran landing y pase).
    const activePromotions = await this.findActivePromotions(program.id);
    const maskedCustomer = toCashierCustomer(pass.customer);

    if (dto.action === ScanActionType.STAMP) {
      const options = await this.buildStampOptions(
        dto,
        membership.role === MerchantRole.OWNER,
        merchant.brandId,
        pass.id,
        receiptFile,
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
        void this.passesService.notifyPassUpdate(pass.id);
      }
      return result;
    }

    if (dto.action === ScanActionType.REDEEM) {
      if (receiptFile) {
        throw new BadRequestException('La foto de la boleta solo se adjunta al sumar un sello');
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
        void this.passesService.notifyPassUpdate(pass.id);
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
    const program = await this.requireActiveProgram(dto.brandId);

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

    const activePromotions = await this.findActivePromotions(program.id);
    const options = await this.buildStampOptions(dto, true, dto.brandId, pass.id, receiptFile);
    const result = await this.executeStampAction(
      pass,
      { merchant, program },
      activePromotions,
      callerUserId,
      toCashierCustomer(pass.customer),
      ScanMethod.PANEL,
      options,
    );
    void this.passesService.notifyPassUpdate(pass.id);

    return {
      scanId: result.scanId!,
      stampsAdded: result.stampsAdded ?? options.stampCount,
      activeStamps: result.activeStamps,
      rewardUnlocked: result.rewardUnlocked,
    };
  }

  private async requireActiveProgram(brandId: string): Promise<LoyaltyProgram> {
    const program = await findStampsProgram(this.prisma, brandId);
    if (!program || !program.isActive) {
      throw new BadRequestException('El comercio no tiene una promoción activa válida');
    }
    return program;
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
   * STAFF: siempre 1 sello y con el bloqueo entre sellos. OWNER: hasta ownerMaxStamps por
   * carga; varios sellos exigen motivo (queda en AuditLog). La foto se valida y recodifica
   * antes de abrir la transacción.
   */
  private async buildStampOptions(
    dto: StampInput,
    isOwner: boolean,
    brandId: string,
    passId: string,
    receiptFile?: UploadedImage,
  ): Promise<StampOptions> {
    const stampCount = dto.stampCount ?? 1;

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

    const image = receiptFile ? await sanitizeImage(receiptFile, RECEIPT_LABEL) : null;

    return {
      stampCount,
      isOwner,
      reason: isOwner ? dto.reason : undefined,
      purchaseAmount: dto.purchaseAmount,
      note: dto.note,
      receipt: image
        ? { path: `${brandId}/${passId}/${randomUUID()}.${image.extension}`, image }
        : null,
    };
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
  ): Promise<{ activeStamps: number; nextExpiryAt: Date | null }> {
    const activeStamps = await db.stamp.count({ where: activeStampsWhere(passId, now) });
    const nextExpiring = await db.stamp.findFirst({
      where: { passId, consumedAt: null, expiresAt: { gt: now } },
      orderBy: { expiresAt: 'asc' },
      select: { expiresAt: true },
    });
    return { activeStamps, nextExpiryAt: nextExpiring?.expiresAt ?? null };
  }

  private findLatestStamp(db: Tx, passId: string): Promise<Scan | null> {
    return db.scan.findFirst({
      where: { passId, type: ScanType.STAMP_ADDED },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** null si el pase puede sumar ya; si no, desde cuándo podrá. */
  private cooldownUntil(latestStamp: Scan | null, now: Date): Date | null {
    if (this.stampCooldownMs <= 0 || !latestStamp) return null;
    const until = new Date(latestStamp.createdAt.getTime() + this.stampCooldownMs);
    return until.getTime() > now.getTime() ? until : null;
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
    { merchant, program }: ScanContext,
    activePromotions: Promotion[],
    callerUserId: string,
    maskedCustomer: MaskedCustomerDto | undefined,
    method: ScanMethod,
    options: StampOptions,
  ): Promise<ScanResultDto> {
    const featured = activePromotions[0];

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
      const latestScan = await this.findLatestStamp(tx, pass.id);
      const nextStampAvailableAt = this.cooldownUntil(latestScan, now);
      const overridesCooldown = nextStampAvailableAt !== null && options.isOwner && !!options.reason;

      if (latestScan && nextStampAvailableAt && !overridesCooldown) {
        const minutesLeft = Math.max(
          1,
          Math.ceil((nextStampAvailableAt.getTime() - now.getTime()) / 60000),
        );
        const { activeStamps, nextExpiryAt } = await this.readBalance(tx, pass.id, now);
        const availablePromotions = toPromotionOptions(activePromotions, activeStamps);

        return {
          success: true,
          alreadyScanned: true,
          action: ScanActionType.STAMP,
          method: latestScan.method,
          passId: pass.id,
          activeStamps,
          targetStamps: featured.targetStamps,
          rewardUnlocked: availablePromotions.some((p) => p.canRedeem),
          rewardName: featured.rewardName,
          availablePromotions,
          nextExpiryAt,
          scanId: latestScan.id,
          customer: maskedCustomer,
          nextStampAvailableAt,
          message: options.isOwner
            ? `Este cliente ya recibió un sello hace poco. Para sumar otro antes de ${minutesLeft} min indica el motivo`
            : `Este cliente ya recibió un sello. Podrá sumar otro en ${minutesLeft} min`,
        };
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
          purchaseAmount: options.purchaseAmount ?? null,
          note: options.note ?? null,
        },
      });

      // El sello no se atribuye a ninguna promoción (promotionId queda NULL): es saldo del pase.
      for (let i = 0; i < options.stampCount; i++) {
        await tx.stamp.create({
          data: {
            passId: pass.id,
            merchantId: merchant.id,
            brandId: merchant.brandId,
            programId: program.id,
            sourceScanId: scan.id,
            createdByUserId: callerUserId,
            earnedAt: now,
            expiresAt,
          },
        });
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

      if (options.isOwner && options.reason) {
        await recordAudit(tx, {
          actorUserId: callerUserId,
          actorType: 'OWNER',
          action: 'pass.stamps_added',
          entity: 'Pass',
          entityId: pass.id,
          after: {
            scanId: scan.id,
            merchantId: merchant.id,
            method,
            stampCount: options.stampCount,
            overridesCooldown,
          },
          reason: options.reason,
        });
      }

      const { activeStamps, nextExpiryAt } = await this.readBalance(tx, pass.id, now);
      const availablePromotions = toPromotionOptions(activePromotions, activeStamps);
      const rewardUnlocked = availablePromotions.some((p) => p.canRedeem);
      const added =
        options.stampCount === 1 ? 'Sello agregado' : `${options.stampCount} sellos agregados`;

      return {
        success: true,
        alreadyScanned: false,
        action: ScanActionType.STAMP,
        method,
        passId: pass.id,
        activeStamps,
        targetStamps: featured.targetStamps,
        rewardUnlocked,
        rewardName: featured.rewardName,
        availablePromotions,
        nextExpiryAt,
        scanId: scan.id,
        stampsAdded: options.stampCount,
        customer: maskedCustomer,
        message: rewardUnlocked
          ? `¡${added}! El cliente ya puede canjear un premio (${activeStamps} sellos)`
          : `${added} exitosamente (${activeStamps}/${featured.targetStamps})`,
      };
    });
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
        const { activeStamps, nextExpiryAt } = await this.readBalance(tx, pass.id, now);
        const availablePromotions = toPromotionOptions(activePromotions, activeStamps);

        return {
          success: true,
          alreadyScanned: true,
          action: ScanActionType.REDEEM,
          method: latestRedeem.method,
          passId: pass.id,
          activeStamps,
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

      // FIFO sobre el saldo completo del pase: se consumen los sellos vigentes más antiguos,
      // sin importar en qué momento ni con qué promoción vigente se ganaron.
      const activeStampsList = await tx.stamp.findMany({
        where: activeStampsWhere(pass.id, now),
        orderBy: { earnedAt: 'asc' },
      });

      if (activeStampsList.length < promotion.targetStamps) {
        throw new BadRequestException(
          `Sellos activos insuficientes para canjear "${promotion.name}". Tiene ${activeStampsList.length}, requiere ${promotion.targetStamps}`,
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

      const remainingActiveStamps = activeStampsList.length - promotion.targetStamps;
      const { nextExpiryAt } = await this.readBalance(tx, pass.id, now);
      const availablePromotions = toPromotionOptions(activePromotions, remainingActiveStamps);

      return {
        success: true,
        alreadyScanned: false,
        action: ScanActionType.REDEEM,
        method,
        passId: pass.id,
        activeStamps: remainingActiveStamps,
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
