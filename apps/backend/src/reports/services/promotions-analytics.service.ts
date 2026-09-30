import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ReportPeriodQueryDto } from '../dto/reports-query.dto.js';
import type {
  PromotionMetricDto,
  PromotionPerformanceDto,
} from '../dto/reports-response.dto.js';
import { resolveDateRange } from '../utils/reports-date.util.js';
import type { ReportScope } from './reports-overview.service.js';

@Injectable()
export class PromotionsAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reporte de Promociones: Canjes, días promedio hasta canje y Breakage (sellos vencidos).
   */
  async getPromotions(
    scope: ReportScope,
    query: ReportPeriodQueryDto,
  ): Promise<PromotionPerformanceDto> {
    const scopeFilter = scope.merchantId
      ? { merchantId: scope.merchantId }
      : { brandId: scope.brandId };
    const { from, to } = resolveDateRange(query);

    const [promotions, redemptions, expiredStamps] = await Promise.all([
      this.prisma.promotion.findMany({
        where: { program: { brandId: scope.brandId } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.scan.findMany({
        where: {
          ...scopeFilter,
          type: 'REWARD_REDEEMED',
          createdAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          promotionId: true,
          createdAt: true,
          pass: {
            select: {
              stamps: {
                select: { earnedAt: true },
                orderBy: { earnedAt: 'asc' },
                take: 1,
              },
            },
          },
        },
      }),
      this.prisma.stamp.findMany({
        where: {
          ...scopeFilter,
          expiresAt: { lte: to },
          consumedAt: null,
        },
        select: {
          promotionId: true,
        },
      }),
    ]);

    const resultPromotions: PromotionMetricDto[] = promotions.map((p) => {
      const pRedemptions = redemptions.filter((r) => r.promotionId === p.id);
      const redeemedCount = pRedemptions.length;

      // Calcular días promedio desde el primer sello del pase hasta el canje
      let totalDays = 0;
      let validDaysCount = 0;
      for (const r of pRedemptions) {
        const firstStamp = r.pass?.stamps[0];
        if (firstStamp) {
          const days = (r.createdAt.getTime() - firstStamp.earnedAt.getTime()) / (24 * 60 * 60 * 1000);
          if (days >= 0) {
            totalDays += days;
            validDaysCount++;
          }
        }
      }
      const averageDaysToRedeem =
        validDaysCount > 0 ? Math.round((totalDays / validDaysCount) * 10) / 10 : null;

      // Breakage: sellos vencidos sin consumir
      const breakageCount = expiredStamps.filter((s) => s.promotionId === p.id || !s.promotionId).length;

      return {
        id: p.id,
        name: p.name,
        targetStamps: p.targetStamps,
        rewardName: p.rewardName,
        isActive: p.isActive,
        redeemedCount,
        averageDaysToRedeem,
        breakageCount,
      };
    });

    return { promotions: resultPromotions };
  }
}
