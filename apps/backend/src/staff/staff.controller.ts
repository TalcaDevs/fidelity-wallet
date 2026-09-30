import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { StaffActivityDto, StaffMemberDto } from '@fidelity/shared';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import {
  InviteStaffMemberDto,
  ReassignStaffDto,
  StaffActivityResponseDto,
  StaffMemberResponseDto,
  StaffResponseDto,
} from './dto/staff.dto.js';
import { StaffService } from './staff.service.js';

/** Todo el módulo es solo para el OWNER de la marca (HANDOFF §6.4). */
@ApiTags('Brands & Staff')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Usuario no autenticado' })
@ApiResponse({ status: 403, description: 'No es OWNER de la marca' })
@UseGuards(SupabaseAuthGuard)
@Controller('brands/:brandId/staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'Listar el equipo de la marca (el OWNER incluido)' })
  @ApiResponse({ status: 200, type: StaffMemberResponseDto, isArray: true })
  listStaff(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StaffMemberDto[]> {
    return this.staffService.listStaff(brandId, user.id);
  }

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Invitar o registrar a un mesero en un local de la marca',
    description:
      'Crea un usuario STAFF con la Supabase Admin API. Sin contraseña, Supabase envía un correo de invitación.',
  })
  @ApiResponse({ status: 201, type: StaffResponseDto })
  @ApiResponse({ status: 400, description: 'Validación fallida o error de Supabase' })
  @ApiResponse({ status: 403, description: 'No es OWNER, el local es de otra marca o la marca está suspendida' })
  @ApiResponse({ status: 409, description: 'El usuario ya es miembro de la marca' })
  inviteStaff(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Body() dto: InviteStaffMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StaffResponseDto> {
    return this.staffService.inviteStaff(brandId, user.id, dto);
  }

  @Post(':userId/resend-invite')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reenviar la invitación a un mesero que no ha confirmado su correo' })
  @ApiResponse({ status: 204, description: 'Invitación reenviada' })
  @ApiResponse({ status: 400, description: 'El usuario es el OWNER' })
  @ApiResponse({ status: 404, description: 'No es miembro de la marca' })
  @ApiResponse({ status: 409, description: 'La cuenta ya está activada o se creó con contraseña' })
  resendInvite(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.staffService.resendInvite(brandId, user.id, userId);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Reasignar a un mesero a otro local de la marca' })
  @ApiResponse({ status: 200, type: StaffMemberResponseDto })
  @ApiResponse({ status: 400, description: 'El usuario es el OWNER, o el local es ajeno o está inactivo' })
  @ApiResponse({ status: 404, description: 'No es miembro de la marca' })
  reassignStaff(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: ReassignStaffDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StaffMemberDto> {
    return this.staffService.reassignStaff(brandId, user.id, userId, dto.locationId);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Dar de baja a un mesero',
    description:
      'Borra la membresía y, si el usuario no tiene otra, lo banea en Supabase Auth para invalidar sus refresh tokens.',
  })
  @ApiResponse({ status: 204, description: 'Baja realizada' })
  @ApiResponse({ status: 400, description: 'El usuario es el OWNER o es uno mismo' })
  @ApiResponse({ status: 404, description: 'No es miembro de la marca' })
  removeStaff(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.staffService.removeStaff(brandId, user.id, userId);
  }

  @Get(':userId/scans')
  @ApiOperation({ summary: 'Últimos escaneos hechos por un miembro (teléfono enmascarado)' })
  @ApiResponse({ status: 200, type: StaffActivityResponseDto, isArray: true })
  getStaffActivity(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StaffActivityDto[]> {
    return this.staffService.getStaffActivity(brandId, user.id, userId);
  }
}
