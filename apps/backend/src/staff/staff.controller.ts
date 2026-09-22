import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { InviteStaffMemberDto, StaffResponseDto } from './dto/invite-staff.dto.js';
import { StaffService } from './staff.service.js';

@ApiTags('Merchants & Staff')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('merchants')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post(':merchantId/staff/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Invitar o registrar a un miembro del personal (mesero/cajero)',
    description:
      'Crea un usuario STAFF mediante la Supabase Admin API vinculando merchant_id en metadata. Requiere que el llamador sea OWNER del comercio.',
  })
  @ApiResponse({
    status: 201,
    description: 'Miembro del personal invitado o creado exitosamente',
    type: StaffResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validación fallida o error de Supabase' })
  @ApiResponse({ status: 401, description: 'Usuario no autenticado' })
  @ApiResponse({ status: 403, description: 'Solo el dueño del comercio puede invitar personal' })
  @ApiResponse({ status: 404, description: 'Comercio no encontrado' })
  async inviteStaff(
    @Param('merchantId', new ParseUUIDPipe({ version: '4' })) merchantId: string,
    @Body() dto: InviteStaffMemberDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StaffResponseDto> {
    if (!user?.id) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.staffService.inviteStaff(
      {
        email: dto.email,
        password: dto.password,
        merchantId,
      },
      user.id,
    );
  }
}
