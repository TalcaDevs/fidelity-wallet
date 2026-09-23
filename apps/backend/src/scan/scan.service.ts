import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Customer, Merchant, Pass, Promotion } from '@prisma/client';
import { ScanType } from '@prisma/client';
import { maskPhone, maskRut } from '../common/utils/mask.util.js';
import { PassesService } from '../passes/passes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  MaskedCustomerDto,
  ScanActionDto,
  ScanActionType,
  ScanResultDto,
} from './dto/scan-action.dto.js';

export const ANTI_FRAUD_WINDOW_MS = 90 * 1000; // 90 seconds

type PassWithRelations = Pass & {
  merchant: Merchant;
  customer: Customer | null;
};

@Injectable()
export class ScanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passesService: PassesService,
  ) {}

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

    const pass = await this.prisma.pass.findUnique({
      where: { passToken: dto.passToken },
      include: {
        merchant: true,
        customer: true,
      },
    });

    if (!pass) {
      throw new NotFoundException('No se encontró un pase para el token proporcionado');
    }

    if (pass.merchantId !== dto.merchantId) {
      throw new ForbiddenException('El pase no pertenece a este comercio');
    }

    let promotion: Promotion | null = null;
    if (dto.promotionId) {
      promotion = await this.prisma.promotion.findFirst({
        where: {
          id: dto.promotionId,
          merchantId: dto.merchantId,
          isActive: true,
        },
      });
      if (!promotion) {
        throw new BadRequestException(
          'La promoción especificada no existe o no está activa en este comercio',
        );
      }
    } else {
      const activePromotions = await this.prisma.promotion.findMany({
        where: {
          merchantId: dto.merchantId,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (activePromotions.length === 0) {
        throw new BadRequestException('El comercio no tiene una promoción activa válida');
      }

      if (activePromotions.length > 1) {
        throw new BadRequestException(
          'El comercio tiene múltiples promociones activas. Debe especificar promotionId en la petición de escaneo.',
        );
      }

      promotion = activePromotions[0];
    }

    const maskedCustomer: MaskedCustomerDto | undefined = pass.customer
      ? {
          id: pass.customer.id,
          rut: pass.customer.rut ? maskRut(pass.customer.rut) : null,
          phone: pass.customer.phone ? maskPhone(pass.customer.phone) : null,
        }
      : undefined;

    if (dto.action === ScanActionType.STAMP) {
      const result = await this.executeStampAction(
        pass,
        promotion,
        dto,
        callerUserId,
        maskedCustomer,
      );
      if (!result.alreadyScanned) {
        void this.passesService.notifyPassUpdate(pass.id);
      }
      return result;
    }

    if (dto.action === ScanActionType.REDEEM) {
      const result = await this.executeRedeemAction(
        pass,
        promotion,
        dto,
        callerUserId,
        maskedCustomer,
      );
      if (!result.alreadyScanned) {
        void this.passesService.notifyPassUpdate(pass.id);
      }
      return result;
    }

    const unsupportedAction = String(dto.action);
    throw new BadRequestException(`Acción de escaneo no soportada: ${unsupportedAction}`);
  }

  private async executeStampAction(
    pass: PassWithRelations,
    promotion: Promotion,
    dto: ScanActionDto,
    callerUserId: string,
    maskedCustomer?: MaskedCustomerDto,
  ): Promise<ScanResultDto> {
    const now = new Date();
    const expiresAt =
      pass.merchant.stampValidityDays && pass.merchant.stampValidityDays > 0
        ? new Date(now.getTime() + pass.merchant.stampValidityDays * 24 * 60 * 60 * 1000)
        : null;

    return this.prisma.$transaction(async (tx) => {
      // Bloqueo pesimista de fila en Pass para serializar operaciones sobre el mismo pase
      await tx.$queryRaw`SELECT id FROM "Pass" WHERE id = ${pass.id}::uuid FOR UPDATE`;

      // Ventana anti-duplicado atómica de 90 segundos
      const latestScan = await tx.scan.findFirst({
        where: {
          passId: pass.id,
          merchantId: dto.merchantId,
          type: ScanType.STAMP_ADDED,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Filtro de promoción para sellos (soporta también sellos previos sin promotionId)
      const promotionFilter = {
        OR: [{ promotionId: promotion.id }, { promotionId: null }],
      };

      if (latestScan && now.getTime() - latestScan.createdAt.getTime() < ANTI_FRAUD_WINDOW_MS) {
        const activeStamps = await tx.stamp.count({
          where: {
            passId: pass.id,
            consumedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            AND: [promotionFilter],
          },
        });

        const nextExpiring = await tx.stamp.findFirst({
          where: {
            passId: pass.id,
            consumedAt: null,
            expiresAt: { gt: now },
            AND: [promotionFilter],
          },
          orderBy: { expiresAt: 'asc' },
          select: { expiresAt: true },
        });

        return {
          success: true,
          alreadyScanned: true,
          action: ScanActionType.STAMP,
          passId: pass.id,
          activeStamps,
          targetStamps: promotion.targetStamps,
          rewardUnlocked: activeStamps >= promotion.targetStamps,
          rewardName: promotion.rewardName,
          nextExpiryAt: nextExpiring?.expiresAt ?? null,
          scanId: latestScan.id,
          customer: maskedCustomer,
          message: 'El sello ya fue registrado en los últimos 90 segundos',
        };
      }

      const scan = await tx.scan.create({
        data: {
          passId: pass.id,
          merchantId: dto.merchantId,
          type: ScanType.STAMP_ADDED,
          createdByUserId: callerUserId,
        },
      });

      await tx.stamp.create({
        data: {
          passId: pass.id,
          merchantId: dto.merchantId,
          promotionId: promotion.id,
          sourceScanId: scan.id,
          createdByUserId: callerUserId,
          earnedAt: now,
          expiresAt,
        },
      });

      const activeStamps = await tx.stamp.count({
        where: {
          passId: pass.id,
          consumedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          AND: [promotionFilter],
        },
      });

      const nextExpiring = await tx.stamp.findFirst({
        where: {
          passId: pass.id,
          consumedAt: null,
          expiresAt: { gt: now },
          AND: [promotionFilter],
        },
        orderBy: { expiresAt: 'asc' },
        select: { expiresAt: true },
      });

      return {
        success: true,
        alreadyScanned: false,
        action: ScanActionType.STAMP,
        passId: pass.id,
        activeStamps,
        targetStamps: promotion.targetStamps,
        rewardUnlocked: activeStamps >= promotion.targetStamps,
        rewardName: promotion.rewardName,
        nextExpiryAt: nextExpiring?.expiresAt ?? null,
        scanId: scan.id,
        customer: maskedCustomer,
        message:
          activeStamps >= promotion.targetStamps
            ? `¡Sello agregado! ¡Premio "${promotion.rewardName}" desbloqueado!`
            : `Sello agregado exitosamente (${activeStamps}/${promotion.targetStamps})`,
      };
    });
  }

  private async executeRedeemAction(
    pass: PassWithRelations,
    promotion: Promotion,
    dto: ScanActionDto,
    callerUserId: string,
    maskedCustomer?: MaskedCustomerDto,
  ): Promise<ScanResultDto> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // Bloqueo pesimista de fila en Pass para serializar operaciones sobre el mismo pase
      await tx.$queryRaw`SELECT id FROM "Pass" WHERE id = ${pass.id}::uuid FOR UPDATE`;

      // Ventana anti-duplicado de 90 segundos para canje
      const latestRedeem = await tx.scan.findFirst({
        where: {
          passId: pass.id,
          merchantId: dto.merchantId,
          type: ScanType.REWARD_REDEEMED,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Filtro de promoción para sellos (soporta también sellos previos sin promotionId)
      const promotionFilter = {
        OR: [{ promotionId: promotion.id }, { promotionId: null }],
      };

      if (latestRedeem && now.getTime() - latestRedeem.createdAt.getTime() < ANTI_FRAUD_WINDOW_MS) {
        const currentActiveStamps = await tx.stamp.count({
          where: {
            passId: pass.id,
            consumedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            AND: [promotionFilter],
          },
        });

        const nextExpiring = await tx.stamp.findFirst({
          where: {
            passId: pass.id,
            consumedAt: null,
            expiresAt: { gt: now },
            AND: [promotionFilter],
          },
          orderBy: { expiresAt: 'asc' },
          select: { expiresAt: true },
        });

        return {
          success: true,
          alreadyScanned: true,
          action: ScanActionType.REDEEM,
          passId: pass.id,
          activeStamps: currentActiveStamps,
          targetStamps: promotion.targetStamps,
          rewardUnlocked: currentActiveStamps >= promotion.targetStamps,
          rewardName: promotion.rewardName,
          nextExpiryAt: nextExpiring?.expiresAt ?? null,
          scanId: latestRedeem.id,
          customer: maskedCustomer,
          message: 'El canje ya fue procesado en los últimos 90 segundos',
        };
      }

      // FIFO: Seleccionar sellos activos más antiguos correspondientes a esta promoción
      const activeStampsList = await tx.stamp.findMany({
        where: {
          passId: pass.id,
          consumedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          AND: [promotionFilter],
        },
        orderBy: { earnedAt: 'asc' },
      });

      if (activeStampsList.length < promotion.targetStamps) {
        throw new BadRequestException(
          `Sellos activos insuficientes para canjear el premio. Tiene ${activeStampsList.length}, requiere ${promotion.targetStamps}`,
        );
      }

      const scan = await tx.scan.create({
        data: {
          passId: pass.id,
          merchantId: dto.merchantId,
          type: ScanType.REWARD_REDEEMED,
          createdByUserId: callerUserId,
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

      const nextExpiring = await tx.stamp.findFirst({
        where: {
          passId: pass.id,
          consumedAt: null,
          expiresAt: { gt: now },
          AND: [promotionFilter],
        },
        orderBy: { expiresAt: 'asc' },
        select: { expiresAt: true },
      });

      return {
        success: true,
        alreadyScanned: false,
        action: ScanActionType.REDEEM,
        passId: pass.id,
        activeStamps: remainingActiveStamps,
        targetStamps: promotion.targetStamps,
        rewardUnlocked: remainingActiveStamps >= promotion.targetStamps,
        rewardName: promotion.rewardName,
        nextExpiryAt: nextExpiring?.expiresAt ?? null,
        scanId: scan.id,
        consumedStampsCount: promotion.targetStamps,
        customer: maskedCustomer,
        message: `Premio "${promotion.rewardName}" canjeado exitosamente`,
      };
    });
  }
}
