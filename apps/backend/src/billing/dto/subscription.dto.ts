import { ApiProperty } from '@nestjs/swagger';
import type {
  BillingCycle,
  PlanId,
  PlanUsage,
  SubscriptionMock,
  SubscriptionStatus,
} from '@fidelity/shared';

class PlanUsageDto implements PlanUsage {
  @ApiProperty() programs: number;
  @ApiProperty() locations: number;
  @ApiProperty({ description: 'Solo STAFF' }) teamUsers: number;
  @ApiProperty({ description: 'Pases emitidos por la marca' })
  customers: number;
}

export class SubscriptionResponseDto implements SubscriptionMock {
  @ApiProperty({ enum: ['TRIAL', 'STARTER', 'PRO', 'BUSINESS'] })
  planId: PlanId;
  @ApiProperty({ enum: ['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED'] })
  status: SubscriptionStatus;
  @ApiProperty({ enum: ['MONTHLY', 'ANNUAL'] }) billingCycle: BillingCycle;
  @ApiProperty({ type: String, nullable: true }) trialEndsAt: string | null;
  @ApiProperty() currentPeriodEnd: string;
  @ApiProperty({ type: PlanUsageDto }) usage: PlanUsageDto;
}
