import { Injectable } from '@nestjs/common';
import { MerchantRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ReportPeriodQueryDto } from '../dto/reports-query.dto.js';
import type {
  StaffActivityDto,
  StaffAlertDto,
  StaffMemberMetricDto,
} from '../dto/reports-response.dto.js';
import { resolveDateRange } from '../utils/reports-date.util.js';
import { type ReportScope, scopeWhere } from '../reports.types.js';

@Injectable()
export class StaffAuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reporte de Personal (Staff): Auditoría, métodos de escaneo y alertas antifraude.
   */
  async getStaffActivity(
    scope: ReportScope,
    query: ReportPeriodQueryDto,
  ): Promise<StaffActivityDto> {
    const filter = scopeWhere(scope);
    const { from, toExclusive } = resolveDateRange(query);

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
        where: { ...filter, createdAt: { gte: from, lt: toExclusive } },
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
      alerts.push(...this.detectExcessiveStamps(userScans));

      // Heurística 2: Miembro del equipo con > 50% de sellos MANUAL con al menos 20 operaciones
      const highManualAlert = this.detectHighManualScanRatio(totalOps, manualOps, manualPercentage);
      if (highManualAlert) {
        alerts.push(highManualAlert);
      }

      staffMetrics.push({
        userId: uid,
        staffName: null,
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

  /**
   * Detecta si un miembro del equipo otorgó 4 o más sellos al mismo pase en menos de 7 días.
   */
  private detectExcessiveStamps(
    userScans: Array<{ type: string; passId: string; createdAt: Date }>,
  ): StaffAlertDto[] {
    const alerts: StaffAlertDto[] = [];
    const passStampTimes: Record<string, number[]> = {};

    for (const s of userScans) {
      if (s.type === 'STAMP_ADDED') {
        if (!passStampTimes[s.passId]) passStampTimes[s.passId] = [];
        passStampTimes[s.passId].push(s.createdAt.getTime());
      }
    }

    for (const times of Object.values(passStampTimes)) {
      if (times.length >= 4) {
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

    return alerts;
  }

  /**
   * Detecta si más del 50% de operaciones fueron manuales cuando hay un volumen representativo (>= 20).
   */
  private detectHighManualScanRatio(
    totalOps: number,
    manualOps: number,
    manualPercentage: number,
  ): StaffAlertDto | null {
    if (totalOps >= 20 && manualPercentage > 50) {
      return {
        type: 'HIGH_MANUAL_SCAN_RATIO',
        severity: 'medium',
        description: `Más del 50% de los registros fueron mediante búsqueda manual (${manualOps} de ${totalOps}).`,
      };
    }
    return null;
  }
}
