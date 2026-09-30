import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UnauthorizedException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { InviteStaffMemberDto, StaffResponseDto } from './dto/invite-staff.dto.js';
import { StaffService } from './staff.service.js';

@ApiTags('Brands & Staff')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('brands')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post(':brandId/staff/invite')
  @Roles('OWNER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Invitar o registrar a un miembro del personal (mesero/cajero)',
    description:
      'Crea un usuario STAFF mediante la Supabase Admin API vinculando brand_id en metadata. Requiere que el llamador sea OWNER de la marca.',
  })
  @ApiResponse({
    status: 201,
    description: 'Miembro del personal invitado o creado exitosamente',
    type: StaffResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validación fallida o error de Supabase' })
  @ApiResponse({ status: 401, description: 'Usuario no autenticado' })
  @ApiResponse({ status: 403, description: 'Solo el dueño de la marca puede invitar personal' })
  @ApiResponse({ status: 404, description: 'Marca no encontrada' })
  async inviteStaff(
    @Param('brandId', new ParseUUIDPipe({ version: '4' })) brandId: string,
    @Body() dto: InviteStaffMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StaffResponseDto> {
    return this.staffService.inviteStaff(
      {
        email: dto.email,
        password: dto.password,
        locationId: dto.locationId,
        merchantId: brandId, // mapped to merchantId for now
      },
      user.id,
    );
  }

  @Get(':brandId/staff')
  @Roles('OWNER')
  @ApiOperation({
    summary: 'Listar personal de una marca',
    description: 'Devuelve la lista de usuarios STAFF con su estado y último acceso. Requiere rol OWNER.',
  })
  @ApiResponse({ status: 200, description: 'Lista de personal' })
  async listStaff(
    @Param('brandId', new ParseUUIDPipe({ version: '4' })) brandId: string,
  ) {
    return this.staffService.listStaff(brandId);
  }

  @Delete(':brandId/staff/:userId')
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Dar de baja a un miembro del personal',
    description: 'Elimina el acceso del usuario a la marca. Requiere rol OWNER.',
  })
  @ApiResponse({ status: 204, description: 'Personal eliminado exitosamente' })
  async removeStaff(
    @Param('brandId', new ParseUUIDPipe({ version: '4' })) brandId: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userIdToRemove: string,
  ) {
    return this.staffService.removeStaff(brandId, userIdToRemove);
  }

  @Post(':brandId/staff/:userId/resend-invite')
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reenviar invitación a un miembro del personal',
    description: 'Reenvía el correo de invitación. Requiere rol OWNER.',
  })
  @ApiResponse({ status: 204, description: 'Invitación reenviada' })
  async resendInvite(
    @Param('brandId', new ParseUUIDPipe({ version: '4' })) brandId: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userIdToResend: string,
  ) {
    return this.staffService.resendInvite(brandId, userIdToResend);
  }

  @Get(':brandId/staff/:userId/scans')
  @Roles('OWNER')
  @ApiOperation({
    summary: 'Ver actividad del personal',
    description: 'Devuelve los últimos escaneos realizados por un usuario STAFF.',
  })
  @ApiResponse({ status: 200, description: 'Lista de escaneos' })
  async getStaffActivity(
    @Param('brandId', new ParseUUIDPipe({ version: '4' })) brandId: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) targetUserId: string,
  ) {
    return this.staffService.getStaffActivity(brandId, targetUserId);
  }

}
