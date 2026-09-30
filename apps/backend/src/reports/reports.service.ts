import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  requireBrandOwner,
  resolveLocationAccess,
} from '../common/access/brand-access.js';
import type { ReportPeriodQueryDto, RetentionReportQueryDto } from './dto/reports-query.dto.js';
import type {
  OverviewReportDto,
  PromotionPerformanceDto,
  RetentionReportDto,
  StaffActivityDto,
} from './dto/reports-response.dto.js';
import { ReportsOverviewService } from './services/reports-overview.service.js';
import { RetentionAnalyticsService } from './services/retention-analytics.service.js';
import { PromotionsAnalyticsService } from './services/promotions-analytics.service.js';
import { StaffAuditService } from './services/staff-audit.service.js';
import { type ReportScope } from './reports.types.js';

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
   * Valida permisos: el usuario debe ser OWNER de la marca o del local correspondiente.
   * Utiliza los helpers de seguridad compartidos (resolveLocationAccess / requireBrandOwner).
   * Responde 403 tanto para IDs ajenos como inexistentes para prevenir la enumeración de UUIDs.
   */
  async assertOwner(targetId: string, callerUserId: string): Promise<ReportScope> {
    if (!callerUserId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // 1. Intentar resolver como local (Merchant)
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: targetId },
      select: { id: true, brandId: true },
    });

    if (merchant) {
      await resolveLocationAccess(this.prisma, callerUserId, merchant.id, {
        ownerOnly: true,
        requireOperational: false,
      });
      return { brandId: merchant.brandId, merchantId: merchant.id };
    }

    // 2. Si no es un local, resolver como marca (Brand)
    await requireBrandOwner(this.prisma, callerUserId, targetId);
    return { brandId: targetId, merchantId: null };
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
