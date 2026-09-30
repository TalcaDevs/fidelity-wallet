import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { SubscriptionMock } from '@fidelity/shared';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { SubscriptionResponseDto } from './dto/subscription.dto.js';
import { BillingService } from './billing.service.js';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('brands/:brandId/billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('subscription')
  @ApiOperation({
    summary: 'Suscripción simulada de la marca, con el uso real (solo OWNER)',
  })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  @ApiResponse({ status: 403, description: 'No es OWNER de la marca' })
  getSubscription(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionMock> {
    return this.billing.getSubscription(brandId, user.id);
  }
}
