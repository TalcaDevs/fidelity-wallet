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
import type { ReportScope } from './reports-overview.service.js';

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
    const scopeFilter = scope.merchantId
      ? { merchantId: scope.merchantId }
      : { brandId: scope.brandId };
    const { from, to } = resolveDateRange(query);

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
          // Ya ordenados cronológicamente por query
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
}
