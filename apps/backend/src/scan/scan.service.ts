import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Customer, Merchant, Pass, Prisma, Promotion } from '@prisma/client';
import { ScanMethod, ScanType } from '@prisma/client';
import { maskPhone, maskRut } from '../common/utils/mask.util.js';
import { normalizePhone } from '../common/utils/phone.util.js';
import { cleanRut, validateRut } from '../common/utils/rut.util.js';
import { ConfigService } from '@nestjs/config';
import { PassesService } from '../passes/passes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  MaskedCustomerDto,
  PromotionOptionDto,
  ScanActionDto,
  ScanActionType,
  ScanResultDto,
} from './dto/scan-action.dto.js';
import { ManualLookupLimiter } from './manual-lookup-limiter.js';

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

type PassWithRelations = Pass & {
  merchant: Merchant;
  customer: Customer | null;
};

type Tx = Prisma.TransactionClient;

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

@Injectable()
export class ScanService {
  private readonly stampCooldownMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passesService: PassesService,
    configService: ConfigService,
    private readonly manualLookupLimiter: ManualLookupLimiter,
  ) {
    this.stampCooldownMs = resolveStampCooldownMs(
      configService.get<string>('STAMP_COOLDOWN_MINUTES'),
    );
  }

  async processScan(dto: ScanActionDto, callerUserId: string): Promise<ScanResultDto> {
    if (!callerUserId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const membership = await this.prisma.merchantUser.findUnique({
      where: {
        userId_merchantId: {
          userId: callerUserId,
          merchantId: dto.merchantId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'El usuario no está autorizado como personal o dueño en este comercio',
      );
    }

    // El límite va después de validar la membresía (un extraño no consume el cupo de nadie) y
    // antes de buscar (el intento cuenta aunque el RUT no exista: eso es justo lo que se frena).
    if (!dto.passToken) {
      this.manualLookupLimiter.consume(callerUserId);
    }

    const pass = await this.resolvePass(dto);

    // Los sellos son un saldo único del pase: cualquier sello vigente sirve para cualquier
    // promoción activa. La más reciente es la "de referencia" (la que muestran landing y pase).
    const activePromotions = await this.prisma.promotion.findMany({
      where: { merchantId: dto.merchantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (activePromotions.length === 0) {
      throw new BadRequestException('El comercio no tiene una promoción activa válida');
    }

    // Solo datos enmascarados: el cajero no necesita el id interno del cliente.
    const maskedCustomer: MaskedCustomerDto | undefined = pass.customer
      ? {
          rut: pass.customer.rut ? maskRut(pass.customer.rut) : null,
          phone: pass.customer.phone ? maskPhone(pass.customer.phone) : null,
        }
      : undefined;

    const method: ScanMethod = dto.passToken ? ScanMethod.QR : ScanMethod.MANUAL;

    if (dto.action === ScanActionType.STAMP) {
      const result = await this.executeStampAction(
        pass,
        activePromotions,
        dto,
        callerUserId,
        maskedCustomer,
        method,
      );
      if (!result.alreadyScanned) {
        void this.passesService.notifyPassUpdate(pass.id);
      }
      return result;
    }

    if (dto.action === ScanActionType.REDEEM) {
      const chosen = this.resolveRedeemPromotion(activePromotions, dto.promotionId);
      const result = await this.executeRedeemAction(
        pass,
        chosen,
        activePromotions,
        dto,
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

  /**
   * Resuelve el pase a partir del QR (passToken) o, en el ingreso manual, del RUT/teléfono
   * del cliente. El ingreso manual solo busca dentro del comercio del escaneo, así que no
   * puede alcanzar pases de otro local.
   */
  private async resolvePass(dto: ScanActionDto): Promise<PassWithRelations> {
    const include = { merchant: true, customer: true } as const;

    if (dto.passToken) {
      const pass = await this.prisma.pass.findUnique({
        where: { passToken: dto.passToken },
        include,
      });

      if (!pass) {
        throw new NotFoundException('No se encontró un pase para el token proporcionado');
      }

      if (pass.merchantId !== dto.merchantId) {
        throw new ForbiddenException('El pase no pertenece a este comercio');
      }

      return pass;
    }

    const rawRut = dto.customer?.rut?.trim();
    const rawPhone = dto.customer?.phone?.trim();
    let customerWhere: { rut: string } | { phone: string };

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
    } else {
      throw new BadRequestException(
        'Debe escanear el QR del pase o ingresar el RUT/teléfono del cliente',
      );
    }

    const pass = await this.prisma.pass.findFirst({
      where: { merchantId: dto.merchantId, customer: customerWhere },
      include,
    });

    if (!pass) {
      throw new NotFoundException('El cliente no tiene una tarjeta en este comercio');
    }

    return pass;
  }

  /** Saldo del pase (todas las promociones) y su próximo vencimiento. */
  private async readBalance(
    tx: Tx,
    passId: string,
    now: Date,
  ): Promise<{ activeStamps: number; nextExpiryAt: Date | null }> {
    const activeStamps = await tx.stamp.count({ where: activeStampsWhere(passId, now) });
    const nextExpiring = await tx.stamp.findFirst({
      where: { passId, consumedAt: null, expiresAt: { gt: now } },
      orderBy: { expiresAt: 'asc' },
      select: { expiresAt: true },
    });
    return { activeStamps, nextExpiryAt: nextExpiring?.expiresAt ?? null };
  }

  private async executeStampAction(
    pass: PassWithRelations,
    activePromotions: Promotion[],
    dto: ScanActionDto,
    callerUserId: string,
    maskedCustomer: MaskedCustomerDto | undefined,
    method: ScanMethod,
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
        pass.merchant.stampValidityDays && pass.merchant.stampValidityDays > 0
          ? new Date(now.getTime() + pass.merchant.stampValidityDays * 24 * 60 * 60 * 1000)
          : null;

      // Bloqueo por pase: un sello cada stampCooldownMs. Se evalúa dentro del lock de fila,
      // así que dos cajeros escaneando a la vez no pueden colar un segundo sello.
      const latestScan = await tx.scan.findFirst({
        where: {
          passId: pass.id,
          merchantId: dto.merchantId,
          type: ScanType.STAMP_ADDED,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (
        this.stampCooldownMs > 0 &&
        latestScan &&
        now.getTime() - latestScan.createdAt.getTime() < this.stampCooldownMs
      ) {
        const nextStampAvailableAt = new Date(latestScan.createdAt.getTime() + this.stampCooldownMs);
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
          method: latestScan.method ?? method,
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
          message: `Este cliente ya recibió un sello. Podrá sumar otro en ${minutesLeft} min`,
        };
      }

      const scan = await tx.scan.create({
        data: {
          passId: pass.id,
          merchantId: dto.merchantId,
          type: ScanType.STAMP_ADDED,
          createdByUserId: callerUserId,
          method,
        },
      });

      // El sello no se atribuye a ninguna promoción (promotionId queda NULL): es saldo del pase.
      await tx.stamp.create({
        data: {
          passId: pass.id,
          merchantId: dto.merchantId,
          sourceScanId: scan.id,
          createdByUserId: callerUserId,
          earnedAt: now,
          expiresAt,
        },
      });

      const { activeStamps, nextExpiryAt } = await this.readBalance(tx, pass.id, now);
      const availablePromotions = toPromotionOptions(activePromotions, activeStamps);
      const rewardUnlocked = availablePromotions.some((p) => p.canRedeem);

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
        customer: maskedCustomer,
        message: rewardUnlocked
          ? `¡Sello agregado! El cliente ya puede canjear un premio (${activeStamps} sellos)`
          : `Sello agregado exitosamente (${activeStamps}/${featured.targetStamps})`,
      };
    });
  }

  private async executeRedeemAction(
    pass: PassWithRelations,
    promotion: Promotion,
    activePromotions: Promotion[],
    dto: ScanActionDto,
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
          merchantId: dto.merchantId,
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
          method: latestRedeem.method ?? method,
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
          merchantId: dto.merchantId,
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
