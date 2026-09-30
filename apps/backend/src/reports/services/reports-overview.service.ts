import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ReportPeriodQueryDto } from '../dto/reports-query.dto.js';
import type {
  KpiMetricDto,
  MethodDistributionDto,
  OverviewReportDto,
  TimeSeriesPointDto,
} from '../dto/reports-response.dto.js';
import {
  calcChangePercentage,
  formatDateInTz,
  resolveDateRange,
} from '../utils/reports-date.util.js';

export interface ReportScope {
  brandId: string;
  merchantId: string | null;
}

@Injectable()
export class ReportsOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reporte General (Overview): KPIs comparativos, series temporales y distribución QR vs Manual.
   */
  async getOverview(scope: ReportScope, query: ReportPeriodQueryDto): Promise<OverviewReportDto> {
    const scopeFilter = scope.merchantId
      ? { merchantId: scope.merchantId }
      : { brandId: scope.brandId };
    const { from, to, prevFrom, prevTo, timeZone } = resolveDateRange(query);

    // Consultas del período actual y período anterior en paralelo
    const [
      currScans,
      currPassesCount,
      currExpiredStamps,
      prevScans,
      prevPassesCount,
      prevExpiredStamps,
    ] = await Promise.all([
      this.prisma.scan.findMany({
        where: { ...scopeFilter, createdAt: { gte: from, lte: to } },
        select: {
          id: true,
          type: true,
          method: true,
          createdAt: true,
          pass: { select: { customerId: true } },
        },
      }),
      this.prisma.pass.count({
        where: { ...scopeFilter, createdAt: { gte: from, lte: to } },
      }),
      this.prisma.stamp.count({
        where: { ...scopeFilter, expiresAt: { gte: from, lte: to }, consumedAt: null },
      }),
      this.prisma.scan.findMany({
        where: { ...scopeFilter, createdAt: { gte: prevFrom, lte: prevTo } },
        select: {
          id: true,
          type: true,
          createdAt: true,
          pass: { select: { customerId: true } },
        },
      }),
      this.prisma.pass.count({
        where: { ...scopeFilter, createdAt: { gte: prevFrom, lte: prevTo } },
      }),
      this.prisma.stamp.count({
        where: { ...scopeFilter, expiresAt: { gte: prevFrom, lte: prevTo }, consumedAt: null },
      }),
    ]);

    // Métricas período actual
    const currStamps = currScans.filter((s) => s.type === 'STAMP_ADDED').length;
    const currRewards = currScans.filter((s) => s.type === 'REWARD_REDEEMED').length;
    const currActiveCustomers = new Set(currScans.map((s) => s.pass.customerId)).size;

    const currCustomerScanCounts: Record<string, number> = {};
    for (const s of currScans) {
      const cid = s.pass.customerId;
      currCustomerScanCounts[cid] = (currCustomerScanCounts[cid] || 0) + 1;
    }
    const currRecurringCount = Object.values(currCustomerScanCounts).filter((c) => c >= 2).length;
    const currRecurrenceRate =
      currActiveCustomers > 0
        ? Math.round((currRecurringCount / currActiveCustomers) * 1000) / 10
        : 0;

    // Métricas período anterior
    const prevStamps = prevScans.filter((s) => s.type === 'STAMP_ADDED').length;
    const prevRewards = prevScans.filter((s) => s.type === 'REWARD_REDEEMED').length;
    const prevActiveCustomers = new Set(prevScans.map((s) => s.pass.customerId)).size;

    const prevCustomerScanCounts: Record<string, number> = {};
    for (const s of prevScans) {
      const cid = s.pass.customerId;
      prevCustomerScanCounts[cid] = (prevCustomerScanCounts[cid] || 0) + 1;
    }
    const prevRecurringCount = Object.values(prevCustomerScanCounts).filter((c) => c >= 2).length;
    const prevRecurrenceRate =
      prevActiveCustomers > 0
        ? Math.round((prevRecurringCount / prevActiveCustomers) * 1000) / 10
        : 0;

    // Distribución QR vs Manual
    const qrCount = currScans.filter((s) => s.method === 'QR').length;
    const manualCount = currScans.filter((s) => s.method === 'MANUAL').length;
    const totalScans = qrCount + manualCount;
    const qrPercentage = totalScans > 0 ? Math.round((qrCount / totalScans) * 1000) / 10 : 0;
    const manualPercentage = totalScans > 0 ? Math.round((manualCount / totalScans) * 1000) / 10 : 0;

    // Evolución diaria (TimeSeries)
    const dailyMap: Record<string, { stamps: number; rewards: number; customerIds: Set<string> }> = {};

    for (const scan of currScans) {
      const dateKey = formatDateInTz(scan.createdAt, timeZone);
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { stamps: 0, rewards: 0, customerIds: new Set() };
      }
      if (scan.type === 'STAMP_ADDED') {
        dailyMap[dateKey].stamps++;
      } else if (scan.type === 'REWARD_REDEEMED') {
        dailyMap[dateKey].rewards++;
      }
      dailyMap[dateKey].customerIds.add(scan.pass.customerId);
    }

    const timeSeries: TimeSeriesPointDto[] = Object.keys(dailyMap)
      .sort()
      .map((date) => ({
        date,
        stamps: dailyMap[date].stamps,
        rewards: dailyMap[date].rewards,
        uniqueCustomers: dailyMap[date].customerIds.size,
      }));

    const kpi = (current: number, previous: number): KpiMetricDto => ({
      current,
      previous,
      changePercentage: calcChangePercentage(current, previous),
    });

    return {
      kpis: {
        newCustomers: kpi(currPassesCount, prevPassesCount),
        activeCustomers: kpi(currActiveCustomers, prevActiveCustomers),
        stampsDelivered: kpi(currStamps, prevStamps),
        rewardsRedeemed: kpi(currRewards, prevRewards),
        recurrenceRate: kpi(currRecurrenceRate, prevRecurrenceRate),
        expiredStamps: kpi(currExpiredStamps, prevExpiredStamps),
      },
      timeSeries,
      methodDistribution: {
        qrCount,
        manualCount,
        qrPercentage,
        manualPercentage,
      },
    };
  }
}
