import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { ReportsOverviewService } from './services/reports-overview.service.js';
import { RetentionAnalyticsService } from './services/retention-analytics.service.js';
import { PromotionsAnalyticsService } from './services/promotions-analytics.service.js';
import { StaffAuditService } from './services/staff-audit.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [
    ReportsOverviewService,
    RetentionAnalyticsService,
    PromotionsAnalyticsService,
    StaffAuditService,
    ReportsService,
  ],
  exports: [
    ReportsOverviewService,
    RetentionAnalyticsService,
    PromotionsAnalyticsService,
    StaffAuditService,
    ReportsService,
  ],
})
export class ReportsModule {}
