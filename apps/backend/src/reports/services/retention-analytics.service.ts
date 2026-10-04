import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { maskPhone, maskRut } from '../../common/utils/mask.util.js';
import type { RetentionReportQueryDto } from '../dto/reports-query.dto.js';
import type {
  CohortItemDto,
  DormantCustomerDto,
  FrequencyDistributionItemDto,
  RetentionReportDto,
  WeeklyRetentionPointDto,
} from '../dto/reports-response.dto.js';
import { VISIT_SCANS } from '../reports.types.js';
import { formatDateInTz, getMondayOfWeek } from '../utils/reports-date.util.js';
import type { ReportScope } from './reports-overview.service.js';

@Injectable()
export class RetentionAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reporte de Retención, Recurrencia, Clientes Dormidos y Cohortes.
   */
  async getRetention(
    scope: ReportScope,
    query: RetentionReportQueryDto,
  ): Promise<RetentionReportDto> {
    const scopeFilter = scope.merchantId
      ? { merchantId: scope.merchantId }
      : { brandId: scope.brandId };
    const timeZone = query.tz || 'America/Santiago';

    try {
      new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    } catch {
      throw new BadRequestException(`Zona horaria inválida: ${timeZone}`);
    }

    const dormantDays = query.dormantDays ? Number(query.dormantDays) : 30;
    const now = new Date();
    const periodFrom = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 días para retención semanal

    // 1. Consultar pases y scans de los últimos 60 días
    const [scansInPeriod, passes] = await Promise.all([
      this.prisma.scan.findMany({
        where: { ...scopeFilter, ...VISIT_SCANS, createdAt: { gte: periodFrom, lte: now } },
        select: {
          id: true,
          createdAt: true,
          pass: { select: { customerId: true, createdAt: true } },
        },
      }),
      this.prisma.pass.findMany({
        where: { ...scopeFilter },
        select: {
          id: true,
          customerId: true,
          createdAt: true,
          customer: { select: { rut: true, phone: true } },
          scans: {
            where: { ...scopeFilter },
            select: { createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    // 2. Frecuencia de visitas en el rango
    const customerVisits: Record<string, number> = {};
    for (const scan of scansInPeriod) {
      const cid = scan.pass.customerId;
      customerVisits[cid] = (customerVisits[cid] || 0) + 1;
    }
    const totalActive = Object.keys(customerVisits).length;
    let singleVisitCount = 0;
    let twoToThreeVisits = 0;
    let fourOrMoreVisits = 0;

    for (const count of Object.values(customerVisits)) {
      if (count === 1) singleVisitCount++;
      else if (count <= 3) twoToThreeVisits++;
      else fourOrMoreVisits++;
    }

    const visitFrequencyDistribution: FrequencyDistributionItemDto[] = [
      {
        range: '1 visita',
        customerCount: singleVisitCount,
        percentage: totalActive > 0 ? Math.round((singleVisitCount / totalActive) * 1000) / 10 : 0,
      },
      {
        range: '2-3 visitas',
        customerCount: twoToThreeVisits,
        percentage: totalActive > 0 ? Math.round((twoToThreeVisits / totalActive) * 1000) / 10 : 0,
      },
      {
        range: '4+ visitas',
        customerCount: fourOrMoreVisits,
        percentage: totalActive > 0 ? Math.round((fourOrMoreVisits / totalActive) * 1000) / 10 : 0,
      },
    ];

    // 3. Clientes dormidos
    const nowMs = now.getTime();
    const dormantThresholdMs = dormantDays * 24 * 60 * 60 * 1000;
    const dormantCustomersList: DormantCustomerDto[] = [];

    for (const pass of passes) {
      const lastScan = pass.scans[0];
      if (lastScan) {
        const lastVisitTime = new Date(lastScan.createdAt).getTime();
        const inactiveMs = nowMs - lastVisitTime;
        if (inactiveMs >= dormantThresholdMs) {
          const maskedIdentifier =
            (pass.customer.rut ? maskRut(pass.customer.rut) : null) ??
            (pass.customer.phone ? maskPhone(pass.customer.phone) : null) ??
            'Anónimo';

          dormantCustomersList.push({
            customerId: pass.customerId,
            maskedIdentifier,
            lastVisitAt: lastScan.createdAt.toISOString(),
            daysInactive: Math.floor(inactiveMs / (24 * 60 * 60 * 1000)),
          });
        }
      }
    }

    dormantCustomersList.sort((a, b) => b.daysInactive - a.daysInactive);

    // 4. Retención Semanal en el rango
    const weeklyMap: Record<string, { newCust: Set<string>; retCust: Set<string> }> = {};
    for (const scan of scansInPeriod) {
      // Obtener el lunes de la semana sin mutar la fecha original
      const monday = getMondayOfWeek(new Date(scan.createdAt));
      const weekKey = formatDateInTz(monday, timeZone);

      if (!weeklyMap[weekKey]) {
        weeklyMap[weekKey] = { newCust: new Set(), retCust: new Set() };
      }

      const passCreated = new Date(scan.pass.createdAt);
      const isNewThatWeek = formatDateInTz(passCreated, timeZone) >= weekKey;
      if (isNewThatWeek) {
        weeklyMap[weekKey].newCust.add(scan.pass.customerId);
      } else {
        weeklyMap[weekKey].retCust.add(scan.pass.customerId);
      }
    }

    const weeklyRetention: WeeklyRetentionPointDto[] = Object.keys(weeklyMap)
      .sort()
      .map((weekStart) => ({
        weekStart,
        newCustomers: weeklyMap[weekStart].newCust.size,
        returningCustomers: weeklyMap[weekStart].retCust.size,
      }));

    // 5. Cohortes mensuales (acotado a los últimos 6 meses para proteger memoria y event loop)
    const cohortGroups: Record<string, Set<string>> = {};
    for (const pass of passes) {
      const cohortMonth = formatDateInTz(pass.createdAt, timeZone).slice(0, 7); // YYYY-MM
      if (!cohortGroups[cohortMonth]) cohortGroups[cohortMonth] = new Set();
      cohortGroups[cohortMonth].add(pass.customerId);
    }

    const sortedCohorts = Object.keys(cohortGroups).sort().slice(-6);

    // Optimización: Si hay cohortes, limitar la consulta de scans a partir del mes más antiguo evaluado
    let allScansForCohorts: Array<{ createdAt: Date; pass: { customerId: string } }> = [];
    if (sortedCohorts.length > 0) {
      const earliestCohortMonth = sortedCohorts[0]; // YYYY-MM
      const [earlyY, earlyM] = earliestCohortMonth.split('-').map(Number);
      const minCohortDate = new Date(Date.UTC(earlyY, earlyM - 1, 1));

      allScansForCohorts = await this.prisma.scan.findMany({
        where: { ...scopeFilter, ...VISIT_SCANS, createdAt: { gte: minCohortDate } },
        select: {
          createdAt: true,
          pass: { select: { customerId: true } },
        },
      });
    }

    const cohorts: CohortItemDto[] = [];

    for (const month of sortedCohorts) {
      const customersInCohort = cohortGroups[month];
      const totalNew = customersInCohort.size;
      if (totalNew === 0) continue;

      const [y, m] = month.split('-').map(Number);

      const countReturnInOffsetMonth = (offsetMonths: number): number => {
        const targetYear = y + Math.floor((m - 1 + offsetMonths) / 12);
        const targetMonth = ((m - 1 + offsetMonths) % 12) + 1;
        const targetMonthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

        const returnedCusts = new Set<string>();
        for (const scan of allScansForCohorts) {
          if (!customersInCohort.has(scan.pass.customerId)) continue;
          const scanMonth = formatDateInTz(scan.createdAt, timeZone).slice(0, 7);
          if (scanMonth === targetMonthStr) {
            returnedCusts.add(scan.pass.customerId);
          }
        }
        return Math.round((returnedCusts.size / totalNew) * 1000) / 10;
      };

      cohorts.push({
        cohortMonth: month,
        totalNewCustomers: totalNew,
        month1ReturnRate: countReturnInOffsetMonth(1),
        month2ReturnRate: countReturnInOffsetMonth(2),
        month3ReturnRate: countReturnInOffsetMonth(3),
      });
    }

    return {
      weeklyRetention,
      visitFrequencyDistribution,
      dormantCustomers: {
        count: dormantCustomersList.length,
        customers: dormantCustomersList.slice(0, 50),
      },
      cohorts,
    };
  }
}
