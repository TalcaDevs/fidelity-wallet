import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { InviteStaffDto, StaffResponseDto } from './dto/invite-staff.dto.js';
import { StaffService } from './staff.service.js';

@ApiTags('Merchants & Staff')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('merchants')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post('staff/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Invite or register a staff member (cajero/mesero)',
    description:
      'Creates a STAFF user using Supabase Admin API with merchant_id in raw_user_meta_data so handle_new_user associates the staff with the merchant without creating a new merchant.',
  })
  @ApiResponse({
    status: 201,
    description: 'Staff member successfully invited or created',
    type: StaffResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed or Supabase error' })
  @ApiResponse({ status: 404, description: 'Merchant not found' })
  async inviteStaff(
    @Body() dto: InviteStaffDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StaffResponseDto> {
    return this.staffService.inviteStaff(dto, user?.id);
  }

  @Post(':merchantId/staff/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Invite or register a staff member with merchantId in route param',
    description: 'Convenience route passing merchantId as a URL parameter.',
  })
  @ApiResponse({
    status: 201,
    description: 'Staff member successfully invited or created',
    type: StaffResponseDto,
  })
  async inviteStaffParam(
    @Param('merchantId') merchantId: string,
    @Body() dto: Omit<InviteStaffDto, 'merchantId'>,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StaffResponseDto> {
    return this.staffService.inviteStaff(
      {
        ...dto,
        merchantId,
      },
      user?.id,
    );
  }
}
