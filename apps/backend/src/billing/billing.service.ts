import { Injectable } from '@nestjs/common';
import type { PlanId, PlanUsage, SubscriptionMock } from '@fidelity/shared';
import { MerchantRole } from '@prisma/client';
import { requireBrandOwner } from '../common/access/brand-access.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Suscripción simulada (HANDOFF §6.5): el plan lo asigna a mano el equipo interno (Brand.planId);
 * no hay cobro. Una prueba vencida queda PAST_DUE y no se suspende sola (decisión 2026-10-02).
 */
export function toSubscription(
  brand: { planId: PlanId; trialEndsAt: Date },
  usage: PlanUsage,
  now: Date,
): SubscriptionMock {
  const isTrial = brand.planId === 'TRIAL';
  const trialEndsAt = brand.trialEndsAt.toISOString();
  return {
    planId: brand.planId,
    status: isTrial
      ? now < brand.trialEndsAt
        ? 'TRIALING'
        : 'PAST_DUE'
      : 'ACTIVE',
    billingCycle: 'MONTHLY',
    trialEndsAt: isTrial ? trialEndsAt : null,
    currentPeriodEnd: isTrial
      ? trialEndsAt
      : nextMonthlyRenewal(now).toISOString(),
    usage,
  };
}

function nextMonthlyRenewal(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubscription(
    brandId: string,
    callerUserId: string,
    now: Date = new Date(),
  ): Promise<SubscriptionMock> {
    await requireBrandOwner(this.prisma, callerUserId, brandId);
    const [brand, usage] = await Promise.all([
      this.prisma.brand.findUniqueOrThrow({
        where: { id: brandId },
        select: { planId: true, trialEndsAt: true },
      }),
      this.getUsage(brandId),
    ]);
    return toSubscription(brand, usage, now);
  }

  async getUsage(brandId: string): Promise<PlanUsage> {
    const [programs, locations, teamUsers, customers] = await Promise.all([
      this.prisma.loyaltyProgram.count({ where: { brandId, isActive: true } }),
      this.prisma.merchant.count({ where: { brandId } }),
      // El OWNER no ocupa cupo de "usuarios de equipo".
      this.prisma.brandMember.count({
        where: { brandId, role: MerchantRole.STAFF },
      }),
      this.prisma.pass.count({ where: { brandId } }),
    ]);
    return { programs, locations, teamUsers, customers };
  }
}
