import { Injectable } from '@nestjs/common';
import { TRIAL_DAYS, type SubscriptionMock } from '@fidelity/shared';
import { MerchantRole } from '@prisma/client';
import { requireBrandOwner } from '../common/access/brand-access.js';
import { PrismaService } from '../prisma/prisma.service.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Suscripción simulada (HANDOFF §6.5): no hay proveedor de pago, así que toda marca está en el
 * plan de prueba desde su alta. El uso sí es real y es el que se compara contra los límites.
 */
@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSubscription(
    brandId: string,
    callerUserId: string,
    now: Date = new Date(),
  ): Promise<SubscriptionMock> {
    await requireBrandOwner(this.prisma, callerUserId, brandId);

    const [brand, programs, locations, teamUsers, customers] =
      await Promise.all([
        this.prisma.brand.findUniqueOrThrow({
          where: { id: brandId },
          select: { createdAt: true },
        }),
        this.prisma.loyaltyProgram.count({ where: { brandId, isActive: true } }),
        this.prisma.merchant.count({ where: { brandId } }),
        // El OWNER no ocupa cupo de "usuarios de equipo".
        this.prisma.brandMember.count({
          where: { brandId, role: MerchantRole.STAFF },
        }),
        this.prisma.pass.count({ where: { brandId } }),
      ]);

    const trialEndsAt = new Date(
      brand.createdAt.getTime() + TRIAL_DAYS * MS_PER_DAY,
    );

    return {
      planId: 'TRIAL',
      status: now < trialEndsAt ? 'TRIALING' : 'PAST_DUE',
      billingCycle: 'MONTHLY',
      trialEndsAt: trialEndsAt.toISOString(),
      currentPeriodEnd: trialEndsAt.toISOString(),
      usage: { programs, locations, teamUsers, customers },
    };
  }
}
