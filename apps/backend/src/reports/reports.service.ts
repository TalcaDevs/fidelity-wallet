import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MerchantRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ReportPeriodQueryDto, RetentionReportQueryDto } from './dto/reports-query.dto.js';
import type {
  OverviewReportDto,
  PromotionPerformanceDto,
  RetentionReportDto,
  StaffActivityDto,
} from './dto/reports-response.dto.js';
import {
  calcChangePercentage,
  formatDateInTz,
  resolveDateRange,
  type ResolvedDateRange,
} from './utils/reports-date.util.js';
import { ReportsOverviewService, type ReportScope } from './services/reports-overview.service.js';
import { RetentionAnalyticsService } from './services/retention-analytics.service.js';
import { PromotionsAnalyticsService } from './services/promotions-analytics.service.js';
import { StaffAuditService } from './services/staff-audit.service.js';

export type { ReportScope };

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly overviewService: ReportsOverviewService,
    private readonly retentionService: RetentionAnalyticsService,
    private readonly promotionsService: PromotionsAnalyticsService,
    private readonly staffService: StaffAuditService,
  ) {}

  /**
   * Valida permisos: el usuario debe estar autenticado y ser OWNER de la marca del comercio.
   * Soporta targetId tanto a nivel de local (Merchant) como a nivel global de marca (Brand).
   */
  async assertOwner(targetId: string, callerUserId: string): Promise<ReportScope> {
    if (!callerUserId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // 1. Intentar resolver targetId como Merchant (local)
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: targetId },
      select: { id: true, brandId: true },
    });

    let brandId: string;
    let merchantId: string | null = null;

    if (merchant) {
      brandId = merchant.brandId;
      merchantId = merchant.id;
    } else {
      // 2. Si no es un local, intentar resolver como Brand (marca)
      const brand = await this.prisma.brand.findUnique({
        where: { id: targetId },
        select: { id: true },
      });

      if (!brand) {
        throw new NotFoundException('Comercio o marca no encontrado');
      }

      brandId = brand.id;
      merchantId = null;
    }

    // 3. Validar permisos: el usuario debe ser OWNER en BrandMember para la marca
    const membership = await this.prisma.brandMember.findUnique({
      where: {
        userId_brandId: {
          userId: callerUserId,
          brandId,
        },
      },
    });

    if (!membership || membership.role !== MerchantRole.OWNER) {
      throw new ForbiddenException('Solo el dueño del comercio puede acceder a los reportes');
    }

    return { brandId, merchantId };
  }

  // Delegados de utilidades para compatibilidad y encapsulamiento
  resolveDateRange(query: ReportPeriodQueryDto): ResolvedDateRange {
    return resolveDateRange(query);
  }

  formatDateInTz(date: Date, timeZone: string): string {
    return formatDateInTz(date, timeZone);
  }

  calcChangePercentage(current: number, previous: number): number | null {
    return calcChangePercentage(current, previous);
  }

  /**
   * Reporte General (Overview)
   */
  async getOverview(
    targetId: string,
    query: ReportPeriodQueryDto,
    callerUserId: string,
  ): Promise<OverviewReportDto> {
    const scope = await this.assertOwner(targetId, callerUserId);
    return this.overviewService.getOverview(scope, query);
  }

  /**
   * Reporte de Retención y Cohortes
   */
  async getRetention(
    targetId: string,
    query: RetentionReportQueryDto,
    callerUserId: string,
  ): Promise<RetentionReportDto> {
    const scope = await this.assertOwner(targetId, callerUserId);
    return this.retentionService.getRetention(scope, query);
  }

  /**
   * Reporte de Promociones
   */
  async getPromotions(
    targetId: string,
    query: ReportPeriodQueryDto,
    callerUserId: string,
  ): Promise<PromotionPerformanceDto> {
    const scope = await this.assertOwner(targetId, callerUserId);
    return this.promotionsService.getPromotions(scope, query);
  }

  /**
   * Reporte de Personal y Auditoría Antifraude
   */
  async getStaffActivity(
    targetId: string,
    query: ReportPeriodQueryDto,
    callerUserId: string,
  ): Promise<StaffActivityDto> {
    const scope = await this.assertOwner(targetId, callerUserId);
    return this.staffService.getStaffActivity(scope, query);
  }
}
