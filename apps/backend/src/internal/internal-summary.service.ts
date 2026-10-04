import { Injectable } from '@nestjs/common';
import {
  CATALOG_PLANS,
  type InternalSummaryDto,
  type PlanId,
} from '@fidelity/shared';
import { BrandStatus, TicketPriority, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN = [
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_ON_MERCHANT,
];

/** Resumen de la plataforma para la portada de /internal. */
@Injectable()
export class InternalSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(now = new Date()): Promise<InternalSummaryDto> {
    const inAWeek = new Date(now.getTime() + 7 * DAY_MS);
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

    const [
      byStatus,
      byPlan,
      endingSoon,
      expired,
      open,
      unassigned,
      urgent,
      waiting,
      activity,
    ] = await Promise.all([
      this.prisma.brand.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.brand.groupBy({ by: ['planId'], _count: { _all: true } }),
      this.prisma.brand.findMany({
        where: {
          planId: 'TRIAL',
          status: BrandStatus.ACTIVE,
          trialEndsAt: { gte: now, lte: inAWeek },
        },
        orderBy: { trialEndsAt: 'asc' },
        select: { id: true, name: true, trialEndsAt: true },
        take: 20,
      }),
      this.prisma.brand.count({
        where: { planId: 'TRIAL', trialEndsAt: { lt: now } },
      }),
      this.prisma.ticket.count({ where: { status: { in: OPEN } } }),
      this.prisma.ticket.count({
        where: { status: { in: OPEN }, assigneeUserId: null },
      }),
      this.prisma.ticket.count({
        where: { status: { in: OPEN }, priority: TicketPriority.URGENT },
      }),
      this.prisma.ticket.count({
        where: { status: TicketStatus.WAITING_ON_MERCHANT },
      }),
      this.dailyActivity(weekAgo),
    ]);

    const statusCount = (s: BrandStatus) =>
      byStatus.find((r) => r.status === s)?._count._all ?? 0;
    const planCounts = Object.fromEntries(
      CATALOG_PLANS.map((p) => [p.id, 0]),
    ) as Record<PlanId, number>;
    for (const row of byPlan) planCounts[row.planId] = row._count._all;

    return {
      brands: {
        total:
          statusCount(BrandStatus.ACTIVE) + statusCount(BrandStatus.SUSPENDED),
        active: statusCount(BrandStatus.ACTIVE),
        suspended: statusCount(BrandStatus.SUSPENDED),
        byPlan: planCounts,
      },
      trials: {
        endingSoon: endingSoon.map((b) => ({
          id: b.id,
          name: b.name,
          trialEndsAt: b.trialEndsAt.toISOString(),
        })),
        expired,
      },
      tickets: { open, unassigned, urgent, waitingOnMerchant: waiting },
      activity: this.fillDays(activity, now),
    };
  }

  private dailyActivity(since: Date) {
    return this.prisma.$queryRaw<
      {
        day: string;
        stamps: number;
        redemptions: number;
        new_customers: number;
      }[]
    >`
      WITH scans AS (
        SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') AS day,
               count(*) FILTER (WHERE type = 'STAMP_ADDED' AND method <> 'WELCOME')::int AS stamps,
               count(*) FILTER (WHERE type = 'REWARD_REDEEMED')::int AS redemptions
        FROM "Scan" WHERE "createdAt" >= ${since}
        GROUP BY 1
      ), passes AS (
        SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') AS day,
               count(*)::int AS new_customers
        FROM "Pass" WHERE "createdAt" >= ${since}
        GROUP BY 1
      )
      SELECT COALESCE(s.day, p.day) AS day,
             COALESCE(s.stamps, 0) AS stamps,
             COALESCE(s.redemptions, 0) AS redemptions,
             COALESCE(p.new_customers, 0) AS new_customers
      FROM scans s FULL OUTER JOIN passes p ON p.day = s.day`;
  }

  /** Siete días seguidos, incluidos los sin actividad, para que el gráfico no tenga huecos. */
  private fillDays(
    rows: {
      day: string;
      stamps: number;
      redemptions: number;
      new_customers: number;
    }[],
    now: Date,
  ): InternalSummaryDto['activity'] {
    const byDay = new Map(rows.map((r) => [r.day, r]));
    const santiagoDay = (d: Date) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(
        d,
      );

    return Array.from({ length: 7 }, (_, i) => {
      const date = santiagoDay(new Date(now.getTime() - (6 - i) * DAY_MS));
      const row = byDay.get(date);
      return {
        date,
        stamps: row?.stamps ?? 0,
        redemptions: row?.redemptions ?? 0,
        newCustomers: row?.new_customers ?? 0,
      };
    });
  }
}
