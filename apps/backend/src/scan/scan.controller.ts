import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { ScanActionDto, ScanResultDto } from './dto/scan-action.dto.js';
import { ScanService } from './scan.service.js';

@ApiTags('Cashier Scanner (PWA)')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@SkipThrottle()
@Controller('scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Procesar escaneo de pase: agregar sello o canjear premio',
    description:
      'Valida el pase de forma transaccional con bloqueo pesimista de fila, bloqueo de 30 minutos entre sellos del mismo pase (QR o manual), anti-doble canje de 90 segundos, consumo FIFO en canje y auditoría del mesero autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Escaneo procesado exitosamente (o sello ignorado por el bloqueo de 30 min, alreadyScanned=true)',
    type: ScanResultDto,
  })
  @ApiResponse({ status: 400, description: 'Acción inválida o sellos insuficientes para canje' })
  @ApiResponse({ status: 401, description: 'Usuario no autenticado' })
  @ApiResponse({ status: 403, description: 'El pase no pertenece al comercio o el usuario no es miembro' })
  @ApiResponse({ status: 404, description: 'Token de pase no encontrado' })
  @ApiResponse({ status: 409, description: 'Conflicto de concurrencia al canjear sellos' })
  async scanPass(
    @Body() dto: ScanActionDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ScanResultDto> {
    if (!user?.id) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.scanService.processScan(dto, user.id);
  }
}
