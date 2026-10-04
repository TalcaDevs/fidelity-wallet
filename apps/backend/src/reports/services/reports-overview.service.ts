import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ReportPeriodQueryDto } from '../dto/reports-query.dto.js';
import type {
  KpiMetricDto,
  MethodDistributionDto,
  OverviewKpisDto,
  OverviewReportDto,
  TimeSeriesPointDto,
} from '../dto/reports-response.dto.js';
import {
  calcChangePercentage,
  formatDateInTz,
  resolveDateRange,
  type ResolvedDateRange,
} from '../utils/reports-date.util.js';
import { type ReportScope, VISIT_SCANS, scopeWhere } from '../reports.types.js';

export type { ReportScope };

@Injectable()
export class ReportsOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reporte General (Overview): KPIs comparativos, series temporales y distribución QR vs Manual.
   */
  async getOverview(scope: ReportScope, query: ReportPeriodQueryDto): Promise<OverviewReportDto> {
    const range = resolveDateRange(query);
    const filter = scopeWhere(scope);

    // Ejecución paralela de submódulos desacoplados en métodos privados
    const [kpis, timeSeries, methodDistribution] = await Promise.all([
      this.computeOverviewKpis(filter, range),
      this.computeDailyTimeSeries(filter, range),
      this.computeMethodDistribution(filter, range),
    ]);

    // Metadata del período para alinear contratos con el frontend
    const periodFrom = formatDateInTz(range.from, range.timeZone);
    const periodTo = formatDateInTz(new Date(range.toExclusive.getTime() - 1), range.timeZone);

    return {
      period: {
        from: periodFrom,
        to: periodTo,
        timeZone: range.timeZone,
      },
      kpis,
      timeSeries,
      methodDistribution,
    };
  }

  /**
   * Calcula los KPIs comparativos entre el período actual y el anterior equivalente.
   */
  private async computeOverviewKpis(
    filter: { merchantId: string } | { brandId: string },
    range: ResolvedDateRange,
  ): Promise<OverviewKpisDto> {
    const { from, toExclusive, prevFrom, prevToExclusive } = range;

    const [
      currScans,
      currPassesCount,
      currExpiredStamps,
      prevScans,
      prevPassesCount,
      prevExpiredStamps,
    ] = await Promise.all([
      this.prisma.scan.findMany({
        where: { ...filter, ...VISIT_SCANS, createdAt: { gte: from, lt: toExclusive } },
        select: {
          type: true,
          createdAt: true,
          pass: { select: { customerId: true } },
        },
      }),
      this.prisma.pass.count({
        where: { ...filter, createdAt: { gte: from, lt: toExclusive } },
      }),
      this.prisma.stamp.count({
        where: { ...filter, expiresAt: { gte: from, lt: toExclusive }, consumedAt: null },
      }),
      this.prisma.scan.findMany({
        where: { ...filter, ...VISIT_SCANS, createdAt: { gte: prevFrom, lt: prevToExclusive } },
        select: {
          type: true,
          createdAt: true,
          pass: { select: { customerId: true } },
        },
      }),
      this.prisma.pass.count({
        where: { ...filter, createdAt: { gte: prevFrom, lt: prevToExclusive } },
      }),
      this.prisma.stamp.count({
        where: { ...filter, expiresAt: { gte: prevFrom, lt: prevToExclusive }, consumedAt: null },
      }),
    ]);

    // Métricas período actual
    const currStamps = currScans.filter((s) => s.type === 'STAMP_ADDED').length;
    const currRewards = currScans.filter((s) => s.type === 'REWARD_REDEEMED').length;
    const currActiveCustomers = new Set(currScans.map((s) => s.pass.customerId)).size;
    const currRecurrenceRate = this.calculateRecurrenceRate(currScans, range.timeZone);

    // Métricas período anterior
    const prevStamps = prevScans.filter((s) => s.type === 'STAMP_ADDED').length;
    const prevRewards = prevScans.filter((s) => s.type === 'REWARD_REDEEMED').length;
    const prevActiveCustomers = new Set(prevScans.map((s) => s.pass.customerId)).size;
    const prevRecurrenceRate = this.calculateRecurrenceRate(prevScans, range.timeZone);

    return {
      newCustomers: this.buildKpiMetric(currPassesCount, prevPassesCount),
      activeCustomers: this.buildKpiMetric(currActiveCustomers, prevActiveCustomers),
      stampsDelivered: this.buildKpiMetric(currStamps, prevStamps),
      rewardsRedeemed: this.buildKpiMetric(currRewards, prevRewards),
      recurrenceRate: this.buildKpiMetric(currRecurrenceRate, prevRecurrenceRate),
      expiredStamps: this.buildKpiMetric(currExpiredStamps, prevExpiredStamps),
    };
  }

  /**
   * Calcula la tasa de recurrencia deduplicando visitas por cliente y día.
   */
  private calculateRecurrenceRate(
    scans: Array<{ createdAt: Date; pass: { customerId: string } }>,
    timeZone: string,
  ): number {
    const customerVisitDays: Record<string, Set<string>> = {};
    for (const s of scans) {
      const cid = s.pass.customerId;
      const day = formatDateInTz(s.createdAt, timeZone);
      if (!customerVisitDays[cid]) customerVisitDays[cid] = new Set();
      customerVisitDays[cid].add(day);
    }

    const totalActive = Object.keys(customerVisitDays).length;
    if (totalActive === 0) return 0;

    const recurrentCount = Object.values(customerVisitDays).filter((days) => days.size >= 2).length;
    return Math.round((recurrentCount / totalActive) * 1000) / 10;
  }

  /**
   * Calcula la evolución temporal diaria de sellos, canjes y clientes únicos.
   */
  private async computeDailyTimeSeries(
    filter: { merchantId: string } | { brandId: string },
    range: ResolvedDateRange,
  ): Promise<TimeSeriesPointDto[]> {
    const scans = await this.prisma.scan.findMany({
      where: { ...filter, ...VISIT_SCANS, createdAt: { gte: range.from, lt: range.toExclusive } },
      select: {
        type: true,
        createdAt: true,
        pass: { select: { customerId: true } },
      },
    });

    const dailyMap: Record<string, { stamps: number; rewards: number; customerIds: Set<string> }> = {};

    // Inicializar todos los días del rango en timeZone para que no falten fechas en el gráfico
    let cursor = new Date(range.from.getTime());
    while (cursor.getTime() < range.toExclusive.getTime()) {
      const dateKey = formatDateInTz(cursor, range.timeZone);
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { stamps: 0, rewards: 0, customerIds: new Set() };
      }
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }

    for (const scan of scans) {
      const dateKey = formatDateInTz(scan.createdAt, range.timeZone);
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

    return Object.keys(dailyMap)
      .sort()
      .map((date) => ({
        date,
        stamps: dailyMap[date].stamps,
        rewards: dailyMap[date].rewards,
        uniqueCustomers: dailyMap[date].customerIds.size,
      }));
  }

  /**
   * Calcula la distribución de métodos de escaneo (QR vs Manual en caja).
   */
  private async computeMethodDistribution(
    filter: { merchantId: string } | { brandId: string },
    range: ResolvedDateRange,
  ): Promise<MethodDistributionDto> {
    let qrCount = 0;
    let manualCount = 0;

    if (typeof this.prisma.scan.groupBy === 'function') {
      const groups = await this.prisma.scan.groupBy({
        by: ['method'],
        where: { ...filter, createdAt: { gte: range.from, lt: range.toExclusive } },
        _count: { _all: true },
      });

      for (const g of groups) {
        if (g.method === 'QR') qrCount = g._count._all;
        else if (g.method === 'MANUAL') manualCount = g._count._all;
      }
    } else {
      const scans = await this.prisma.scan.findMany({
        where: { ...filter, createdAt: { gte: range.from, lt: range.toExclusive } },
        select: { method: true },
      });
      qrCount = scans.filter((s) => s.method === 'QR').length;
      manualCount = scans.filter((s) => s.method === 'MANUAL').length;
    }

    const totalScans = qrCount + manualCount;
    const qrPercentage = totalScans > 0 ? Math.round((qrCount / totalScans) * 1000) / 10 : 0;
    const manualPercentage = totalScans > 0 ? Math.round((manualCount / totalScans) * 1000) / 10 : 0;

    return {
      qrCount,
      manualCount,
      qrPercentage,
      manualPercentage,
    };
  }

  /**
   * Helper puro para construir un objeto KpiMetricDto.
   */
  private buildKpiMetric(current: number, previous: number): KpiMetricDto {
    return {
      current,
      previous,
      changePercentage: calcChangePercentage(current, previous),
    };
  }
}
