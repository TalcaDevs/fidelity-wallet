import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ScanType } from '@prisma/client';
import { maskPhone, maskRut } from '../common/utils/mask.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ScanActionDto, ScanActionType, ScanResultDto } from './dto/scan-action.dto.js';
import { PassesService } from '../passes/passes.service.js';

export const ANTI_FRAUD_WINDOW_MS = 90 * 1000; // 90 seconds

@Injectable()
export class ScanService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly passesService?: PassesService,
  ) {}

  async processScan(dto: ScanActionDto, callerUserId?: string): Promise<ScanResultDto> {
    if (callerUserId) {
      const membership = await this.prisma.merchantUser.findUnique({
        where: {
          userId_merchantId: {
            userId: callerUserId,
            merchantId: dto.merchantId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenException('User is not authorized as staff or owner for this merchant');
      }

      dto.createdByUserId = callerUserId;
    }

    const pass = await this.prisma.pass.findUnique({
      where: { passToken: dto.passToken },
      include: {
        merchant: true,
        customer: true,
      },
    });

    if (!pass) {
      throw new NotFoundException('Pass not found for given token');
    }

    if (pass.merchantId !== dto.merchantId) {
      throw new ForbiddenException('Pass does not belong to this merchant');
    }

    const promotion = await this.prisma.promotion.findFirst({
      where: {
        merchantId: dto.merchantId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!promotion) {
      throw new BadRequestException('Merchant has no active promotion');
    }

    const maskedCustomer = pass.customer
      ? {
          id: pass.customer.id,
          rut: pass.customer.rut ? maskRut(pass.customer.rut) : null,
          phone: pass.customer.phone ? maskPhone(pass.customer.phone) : null,
        }
      : undefined;

    if (dto.action === ScanActionType.STAMP) {
      const result = await this.executeStampAction(pass, promotion, dto, maskedCustomer);
      if (this.passesService && !result.alreadyScanned) {
        void this.passesService.notifyPassUpdate(pass.id);
      }
      return result;
    }

    if (dto.action === ScanActionType.REDEEM) {
      const result = await this.executeRedeemAction(pass, promotion, dto, maskedCustomer);
      if (this.passesService) {
        void this.passesService.notifyPassUpdate(pass.id);
      }
      return result;
    }

    const unsupportedAction = String(dto.action);
    throw new BadRequestException(`Unsupported scan action: ${unsupportedAction}`);
  }

  private async executeStampAction(
    pass: { id: string; merchant: { stampValidityDays: number | null } },
    promotion: { id: string; targetStamps: number; rewardName: string },
    dto: ScanActionDto,
    maskedCustomer?: { id: string; rut?: string | null; phone?: string | null },
  ): Promise<ScanResultDto> {
    const now = new Date();
    const expiresAt =
      pass.merchant.stampValidityDays && pass.merchant.stampValidityDays > 0
        ? new Date(now.getTime() + pass.merchant.stampValidityDays * 24 * 60 * 60 * 1000)
        : null;

    return this.prisma.$transaction(async (tx) => {
      // Atomic 90-second anti-fraud window checked inside transaction
      const latestScan = await tx.scan.findFirst({
        where: {
          passId: pass.id,
          merchantId: dto.merchantId,
          type: ScanType.STAMP_ADDED,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (latestScan && now.getTime() - latestScan.createdAt.getTime() < ANTI_FRAUD_WINDOW_MS) {
        const activeStamps = await tx.stamp.count({
          where: {
            passId: pass.id,
            consumedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
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
          customer: maskedCustomer,
          message: 'Stamp was already registered within the last 90 seconds',
        };
      }

      const scan = await tx.scan.create({
        data: {
          passId: pass.id,
          merchantId: dto.merchantId,
          type: ScanType.STAMP_ADDED,
          createdByUserId: dto.createdByUserId ?? null,
        },
      });

      await tx.stamp.create({
        data: {
          passId: pass.id,
          merchantId: dto.merchantId,
          promotionId: promotion.id,
          sourceScanId: scan.id,
          createdByUserId: dto.createdByUserId ?? null,
          earnedAt: now,
          expiresAt,
        },
      });

      const activeStamps = await tx.stamp.count({
        where: {
          passId: pass.id,
          consumedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      });

      const nextExpiring = await tx.stamp.findFirst({
        where: {
          passId: pass.id,
          consumedAt: null,
          expiresAt: { gt: now },
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
            ? `Stamp added! Reward "${promotion.rewardName}" unlocked!`
            : `Stamp added successfully (${activeStamps}/${promotion.targetStamps})`,
      };
    });
  }

  private async executeRedeemAction(
    pass: { id: string },
    promotion: { id: string; targetStamps: number; rewardName: string },
    dto: ScanActionDto,
    maskedCustomer?: { id: string; rut?: string | null; phone?: string | null },
  ): Promise<ScanResultDto> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // FIFO: Select oldest valid, non-consumed stamps
      const activeStampsList = await tx.stamp.findMany({
        where: {
          passId: pass.id,
          consumedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { earnedAt: 'asc' },
      });

      if (activeStampsList.length < promotion.targetStamps) {
        throw new BadRequestException(
          `Insufficient active stamps for reward. Has ${activeStampsList.length}, requires ${promotion.targetStamps}`,
        );
      }

      const scan = await tx.scan.create({
        data: {
          passId: pass.id,
          merchantId: dto.merchantId,
          type: ScanType.REWARD_REDEEMED,
          createdByUserId: dto.createdByUserId ?? null,
        },
      });

      const stampsToConsume = activeStampsList.slice(0, promotion.targetStamps);
      const stampIds = stampsToConsume.map((s) => s.id);

      await tx.stamp.updateMany({
        where: { id: { in: stampIds } },
        data: {
          consumedAt: now,
          consumedByScanId: scan.id,
        },
      });

      const remainingActiveStamps = activeStampsList.length - promotion.targetStamps;

      const nextExpiring = await tx.stamp.findFirst({
        where: {
          passId: pass.id,
          consumedAt: null,
          expiresAt: { gt: now },
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
        message: `Reward "${promotion.rewardName}" redeemed successfully`,
      };
    });
  }

  private async countActiveStamps(passId: string): Promise<number> {
    const now = new Date();
    return this.prisma.stamp.count({
      where: {
        passId,
        consumedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }
}
