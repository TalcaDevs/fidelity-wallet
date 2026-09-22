import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { GeneratePassDto, PassEmissionResponseDto } from './dto/generate-pass.dto.js';
import { PassesService } from './passes.service.js';

@ApiTags('Wallet Passes & Engine')
@Controller('passes')
export class PassesController {
  constructor(private readonly passesService: PassesService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(SupabaseAuthGuard)
  @ApiOperation({
    summary: 'Generar pases de Apple Wallet y Google Wallet para un cliente',
    description:
      'Crea el pase criptográfico si no existe y devuelve las URLs seguras de adición a Apple Wallet (.pkpass) y Google Wallet. Requiere sesión autenticada.',
  })
  @ApiResponse({
    status: 201,
    description: 'URLs del pase generadas exitosamente',
    type: PassEmissionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'No hay promoción activa o datos inválidos' })
  @ApiResponse({ status: 401, description: 'Usuario no autenticado' })
  @ApiResponse({ status: 403, description: 'Usuario no autorizado para este comercio' })
  @ApiResponse({ status: 404, description: 'Cliente o Comercio no encontrado' })
  async generatePass(
    @Body() dto: GeneratePassDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PassEmissionResponseDto> {
    if (!user?.id) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.passesService.generatePass(dto, user.id);
  }

  @Get(':passToken/apple')
  @ApiOperation({
    summary: 'Descargar pase firmado de Apple Wallet (.pkpass)',
    description: 'Retorna el archivo binario .pkpass con Content-Type application/vnd.apple.pkpass.',
  })
  @ApiResponse({ status: 200, description: 'Archivo binario .pkpass' })
  @ApiResponse({ status: 404, description: 'Pase no encontrado' })
  async downloadApplePass(
    @Param('passToken') passToken: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.passesService.getApplePassBuffer(passToken);

    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', 'attachment; filename="loyalty-pass.pkpass"');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}
