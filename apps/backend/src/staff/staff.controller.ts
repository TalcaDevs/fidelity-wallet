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

  @Get(':merchantId/staff')
  @ApiOperation({
    summary: 'Listar personal de un comercio',
    description: 'Devuelve la lista de usuarios STAFF con su estado y último acceso. Requiere rol OWNER.',
  })
  @ApiResponse({ status: 200, description: 'Lista de personal' })
  async listStaff(
    @Param('merchantId', new ParseUUIDPipe({ version: '4' })) merchantId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user?.id) throw new UnauthorizedException('Usuario no autenticado');
    return this.staffService.listStaff(merchantId, user.id);
  }

  @Delete(':merchantId/staff/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dar de baja a un miembro del personal',
    description: 'Elimina el acceso del usuario al comercio. Requiere rol OWNER.',
  })
  @ApiResponse({ status: 200, description: 'Personal eliminado exitosamente' })
  async removeStaff(
    @Param('merchantId', new ParseUUIDPipe({ version: '4' })) merchantId: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userIdToRemove: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user?.id) throw new UnauthorizedException('Usuario no autenticado');
    return this.staffService.removeStaff(merchantId, userIdToRemove, user.id);
  }

  @Get(':merchantId/staff/:userId/scans')
  @ApiOperation({
    summary: 'Ver actividad del personal',
    description: 'Devuelve los últimos escaneos realizados por un usuario STAFF.',
  })
  @ApiResponse({ status: 200, description: 'Lista de escaneos' })
  async getStaffActivity(
    @Param('merchantId', new ParseUUIDPipe({ version: '4' })) merchantId: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) targetUserId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user?.id) throw new UnauthorizedException('Usuario no autenticado');
    return this.staffService.getStaffActivity(merchantId, targetUserId, user.id);
  }

  @Patch(':merchantId/staff/:userId/password')
  @ApiOperation({
    summary: 'Actualizar contraseña de staff',
    description: 'Permite al dueño cambiar la contraseña de un operador.',
  })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada exitosamente' })
  async updateStaffPassword(
    @Param('merchantId', new ParseUUIDPipe({ version: '4' })) merchantId: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) targetUserId: string,
    @Body('password') newPassword: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user?.id) throw new UnauthorizedException('Usuario no autenticado');
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    }
    return this.staffService.updateStaffPassword(merchantId, targetUserId, newPassword, user.id);
  }
}
