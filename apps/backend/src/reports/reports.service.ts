import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MerchantRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { maskPhone, maskRut } from '../common/utils/mask.util.js';
import { ReportPeriodQueryDto, RetentionReportQueryDto } from './dto/reports-query.dto.js';
import {
  OverviewReportDto,
  RetentionReportDto,
  PromotionPerformanceDto,
  StaffActivityDto,
  KpiMetricDto,
  TimeSeriesPointDto,
  MethodDistributionDto,
  WeeklyRetentionPointDto,
  FrequencyDistributionItemDto,
  DormantCustomerDto,
  CohortItemDto,
  PromotionMetricDto,
  StaffMemberMetricDto,
  StaffAlertDto,
} from './dto/reports-response.dto.js';

export interface ReportScope {
  brandId: string;
  merchantId: string | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

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

  /**
   * Resuelve y valida las fechas y la zona horaria del reporte.
   * Por defecto toma los últimos 30 días en America/Santiago.
   */
  resolveDateRange(query: ReportPeriodQueryDto): {
    from: Date;
    to: Date;
    prevFrom: Date;
    prevTo: Date;
    timeZone: string;
  } {
    const timeZone = query.tz || 'America/Santiago';

    try {
      new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    } catch {
      throw new BadRequestException(`Zona horaria inválida: ${timeZone}`);
    }

    let to: Date;
    let from: Date;

    if (query.to) {
      to = new Date(query.to);
      if (isNaN(to.getTime())) throw new BadRequestException('Fecha "to" inválida');
    } else {
      to = new Date();
    }

    if (query.from) {
      from = new Date(query.from);
      if (isNaN(from.getTime())) throw new BadRequestException('Fecha "from" inválida');
    } else {
      from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    if (from > to) {
      throw new BadRequestException('La fecha de inicio ("from") no puede ser posterior a la fecha de fin ("to")');
    }

    const durationMs = to.getTime() - from.getTime();
    const maxDaysMs = 366 * 24 * 60 * 60 * 1000;
    if (durationMs > maxDaysMs) {
      throw new BadRequestException('El rango de fechas no puede exceder 366 días');
    }

    const prevTo = new Date(from.getTime());
    const prevFrom = new Date(from.getTime() - durationMs);

    return { from, to, prevFrom, prevTo, timeZone };
  }

  /**
   * Formatea una fecha a YYYY-MM-DD según la zona horaria indicada.
   */
  formatDateInTz(date: Date, timeZone: string): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  }

  /**
   * Calcula la variación porcentual entre dos valores.
   */
  calcChangePercentage(current: number, previous: number): number | null {
    if (previous === 0) {
      if (current === 0) return 0;
      return 100;
    }
    const change = ((current - previous) / previous) * 100;
    return Math.round(change * 10) / 10;
  }

  /**
   * Reporte General (Overview): KPIs comparativos, series temporales y distribución QR vs Manual.
   */
  async getOverview(
    targetId: string,
    query: ReportPeriodQueryDto,
    callerUserId: string,
  ): Promise<OverviewReportDto> {
    const scope = await this.assertOwner(targetId, callerUserId);
    const scopeFilter = scope.merchantId ? { merchantId: scope.merchantId } : { brandId: scope.brandId };
    const { from, to, prevFrom, prevTo, timeZone } = this.resolveDateRange(query);

    // Consultas del período actual
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
      // Consultas del período anterior equivalente
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
      currActiveCustomers > 0 ? Math.round((currRecurringCount / currActiveCustomers) * 1000) / 10 : 0;

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
      prevActiveCustomers > 0 ? Math.round((prevRecurringCount / prevActiveCustomers) * 1000) / 10 : 0;

    // Distribución QR vs Manual
    const qrCount = currScans.filter((s) => s.method === 'QR').length;
    const manualCount = currScans.filter((s) => s.method === 'MANUAL').length;
    const totalScans = qrCount + manualCount;
    const qrPercentage = totalScans > 0 ? Math.round((qrCount / totalScans) * 1000) / 10 : 0;
    const manualPercentage = totalScans > 0 ? Math.round((manualCount / totalScans) * 1000) / 10 : 0;

    // Evolución diaria (TimeSeries)
    const dailyMap: Record<string, { stamps: number; rewards: number; customerIds: Set<string> }> = {};

    // Poblar días en el rango
    const iterDate = new Date(from);
    while (iterDate <= to) {
      const key = this.formatDateInTz(iterDate, timeZone);
      if (!dailyMap[key]) {
        dailyMap[key] = { stamps: 0, rewards: 0, customerIds: new Set() };
      }
      iterDate.setDate(iterDate.getDate() + 1);
    }
    const endKey = this.formatDateInTz(to, timeZone);
    if (!dailyMap[endKey]) {
      dailyMap[endKey] = { stamps: 0, rewards: 0, customerIds: new Set() };
    }

    for (const scan of currScans) {
      const dateKey = this.formatDateInTz(scan.createdAt, timeZone);
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { stamps: 0, rewards: 0, customerIds: new Set() };
      }
      if (scan.type === 'STAMP_ADDED') dailyMap[dateKey].stamps++;
      if (scan.type === 'REWARD_REDEEMED') dailyMap[dateKey].rewards++;
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

    return {
      kpis: {
        newCustomers: {
          current: currPassesCount,
          previous: prevPassesCount,
          changePercentage: this.calcChangePercentage(currPassesCount, prevPassesCount),
        },
        activeCustomers: {
          current: currActiveCustomers,
          previous: prevActiveCustomers,
          changePercentage: this.calcChangePercentage(currActiveCustomers, prevActiveCustomers),
        },
        stampsDelivered: {
          current: currStamps,
          previous: prevStamps,
          changePercentage: this.calcChangePercentage(currStamps, prevStamps),
        },
        rewardsRedeemed: {
          current: currRewards,
          previous: prevRewards,
          changePercentage: this.calcChangePercentage(currRewards, prevRewards),
        },
        recurrenceRate: {
          current: currRecurrenceRate,
          previous: prevRecurrenceRate,
          changePercentage: this.calcChangePercentage(currRecurrenceRate, prevRecurrenceRate),
        },
        expiredStamps: {
          current: currExpiredStamps,
          previous: prevExpiredStamps,
          changePercentage: this.calcChangePercentage(currExpiredStamps, prevExpiredStamps),
        },
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

  /**
   * Reporte de Retención: distribución de frecuencia, clientes dormidos y cohortes.
   */
  async getRetention(
    targetId: string,
    query: RetentionReportQueryDto,
    callerUserId: string,
  ): Promise<RetentionReportDto> {
    const scope = await this.assertOwner(targetId, callerUserId);
    const scopeFilter = scope.merchantId ? { merchantId: scope.merchantId } : { brandId: scope.brandId };
    const { from, to, timeZone } = this.resolveDateRange(query);
    const dormantDays = query.dormantDays || 30;

    // 1. Escaneos y pases en el período
    const [scansInPeriod, passes] = await Promise.all([
      this.prisma.scan.findMany({
        where: { ...scopeFilter, createdAt: { gte: from, lte: to } },
        select: {
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
    const now = Date.now();
    const dormantThresholdMs = dormantDays * 24 * 60 * 60 * 1000;
    const dormantCustomersList: DormantCustomerDto[] = [];

    for (const pass of passes) {
      const lastScan = pass.scans[0];
      if (lastScan) {
        const lastVisitTime = new Date(lastScan.createdAt).getTime();
        const inactiveMs = now - lastVisitTime;
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
      // Obtener el lunes de la semana correspondiente
      const d = new Date(scan.createdAt);
      const day = d.getDay();
      const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diffToMonday));
      const weekKey = this.formatDateInTz(monday, timeZone);

      if (!weeklyMap[weekKey]) {
        weeklyMap[weekKey] = { newCust: new Set(), retCust: new Set() };
      }

      // Si el pase fue creado dentro de la misma semana -> nuevo, si no -> recurrente
      const passCreated = new Date(scan.pass.createdAt);
      const isNewThatWeek = this.formatDateInTz(passCreated, timeZone) >= weekKey;
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

    // 5. Cohortes mensuales (últimos 6 meses)
    const allScansForCohorts = await this.prisma.scan.findMany({
      where: { ...scopeFilter },
      select: {
        createdAt: true,
        pass: { select: { customerId: true, createdAt: true } },
      },
    });

    const cohortGroups: Record<string, Set<string>> = {};
    for (const pass of passes) {
      const cohortMonth = this.formatDateInTz(pass.createdAt, timeZone).slice(0, 7); // YYYY-MM
      if (!cohortGroups[cohortMonth]) cohortGroups[cohortMonth] = new Set();
      cohortGroups[cohortMonth].add(pass.customerId);
    }

    const sortedCohorts = Object.keys(cohortGroups).sort().slice(-6);
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
          const scanMonth = this.formatDateInTz(scan.createdAt, timeZone).slice(0, 7);
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

  /**
   * Reporte de Promociones: Canjes, días promedio hasta canje y Breakage (sellos vencidos).
   */
  async getPromotions(
    targetId: string,
    query: ReportPeriodQueryDto,
    callerUserId: string,
  ): Promise<PromotionPerformanceDto> {
    const scope = await this.assertOwner(targetId, callerUserId);
    const scopeFilter = scope.merchantId ? { merchantId: scope.merchantId } : { brandId: scope.brandId };
    const { from, to } = this.resolveDateRange(query);

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

  /**
   * Reporte de Personal (Staff): Auditoría, métodos de escaneo y alertas antifraude.
   */
  async getStaffActivity(
    targetId: string,
    query: ReportPeriodQueryDto,
    callerUserId: string,
  ): Promise<StaffActivityDto> {
    const scope = await this.assertOwner(targetId, callerUserId);
    const scopeFilter = scope.merchantId ? { merchantId: scope.merchantId } : { brandId: scope.brandId };
    const { from, to } = this.resolveDateRange(query);

    const [brandMembers, scans]: [
      Array<{ userId: string; role: MerchantRole }>,
      Array<{
        id: string;
        type: string;
        method: string;
        passId: string;
        createdByUserId: string | null;
        createdAt: Date;
      }>,
    ] = await Promise.all([
      this.prisma.brandMember.findMany({
        where: {
          brandId: scope.brandId,
          ...(scope.merchantId
            ? {
                OR: [
                  { merchantId: scope.merchantId },
                  { role: MerchantRole.OWNER },
                ],
              }
            : {}),
        },
        select: { userId: true, role: true },
      }),
      this.prisma.scan.findMany({
        where: { ...scopeFilter, createdAt: { gte: from, lte: to } },
        select: {
          id: true,
          type: true,
          method: true,
          passId: true,
          createdByUserId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Obtener todos los IDs de usuario involucrados
    const userIds = new Set<string>(brandMembers.map((bm) => bm.userId));
    for (const scan of scans) {
      if (scan.createdByUserId) userIds.add(scan.createdByUserId);
    }

    const staffMetrics: StaffMemberMetricDto[] = [];

    for (const uid of userIds) {
      const membership = brandMembers.find((bm) => bm.userId === uid);
      const role: string = membership?.role ?? 'STAFF';
      const userScans = scans.filter((s) => s.createdByUserId === uid);

      const stampsCount = userScans.filter((s) => s.type === 'STAMP_ADDED').length;
      const redeemsCount = userScans.filter((s) => s.type === 'REWARD_REDEEMED').length;
      const totalOps = stampsCount + redeemsCount;

      const manualOps = userScans.filter((s) => s.method === 'MANUAL').length;
      const manualPercentage = totalOps > 0 ? Math.round((manualOps / totalOps) * 1000) / 10 : 0;

      const alerts: StaffAlertDto[] = [];

      // Heurística 1: Mismo miembro del equipo da >= 4 sellos al mismo cliente/pase en 7 días
      const passStampTimes: Record<string, number[]> = {};
      for (const s of userScans) {
        if (s.type === 'STAMP_ADDED') {
          if (!passStampTimes[s.passId]) passStampTimes[s.passId] = [];
          passStampTimes[s.passId].push(s.createdAt.getTime());
        }
      }
      for (const times of Object.values(passStampTimes)) {
        if (times.length >= 4) {
          times.sort((a, b) => a - b);
          for (let i = 0; i <= times.length - 4; i++) {
            if (times[i + 3] - times[i] <= 7 * 24 * 60 * 60 * 1000) {
              alerts.push({
                type: 'EXCESSIVE_STAMPS_SAME_CUSTOMER',
                severity: 'high',
                description: 'Se registraron 4 o más sellos otorgados al mismo cliente en menos de 7 días.',
              });
              break;
            }
          }
        }
      }

      // Heurística 2: Miembro del equipo con > 50% de sellos MANUAL con al menos 20 operaciones
      if (totalOps >= 20 && manualPercentage > 50) {
        alerts.push({
          type: 'HIGH_MANUAL_RATIO',
          severity: 'medium',
          description: `Más del 50% de los registros fueron mediante búsqueda manual (${manualOps} de ${totalOps}).`,
        });
      }

      // Heurística 3: Miembro del equipo sella y canjea el mismo pase en menos de 24 horas
      const passOps: Record<string, { stamps: number[]; redeems: number[] }> = {};
      for (const s of userScans) {
        if (!passOps[s.passId]) passOps[s.passId] = { stamps: [], redeems: [] };
        if (s.type === 'STAMP_ADDED') passOps[s.passId].stamps.push(s.createdAt.getTime());
        if (s.type === 'REWARD_REDEEMED') passOps[s.passId].redeems.push(s.createdAt.getTime());
      }
      for (const op of Object.values(passOps)) {
        if (op.stamps.length > 0 && op.redeems.length > 0) {
          let flagged = false;
          for (const stTime of op.stamps) {
            for (const redTime of op.redeems) {
              if (Math.abs(redTime - stTime) <= 24 * 60 * 60 * 1000) {
                alerts.push({
                  type: 'STAMP_AND_REDEEM_SAME_DAY',
                  severity: 'medium',
                  description: 'Sello y canje realizados sobre el mismo pase en un lapso menor a 24 horas.',
                });
                flagged = true;
                break;
              }
            }
            if (flagged) break;
          }
        }
      }

      staffMetrics.push({
        userId: uid,
        role,
        stampsCount,
        redeemsCount,
        manualPercentage,
        alerts,
      });
    }

    staffMetrics.sort((a, b) => b.stampsCount + b.redeemsCount - (a.stampsCount + a.redeemsCount));

    return { staff: staffMetrics };
  }
}
