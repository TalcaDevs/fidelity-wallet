import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { PublicMerchantDto, UpdateSlugDto, UpdateSlugResponseDto } from './dto/public-merchant.dto.js';
import { MerchantsService } from './merchants.service.js';

@ApiTags('Merchants & Staff')
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get('by-slug/:slug')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary: 'Datos públicos del comercio para la landing /join/:slug',
    description:
      'Endpoint público (sin sesión). Resuelve el slug al merchantId y a las promociones activas. No expone el email del dueño; el slug por defecto es neutro (local-<id>), no derivado del email.',
  })
  @ApiResponse({ status: 200, description: 'Comercio encontrado', type: PublicMerchantDto })
  @ApiResponse({ status: 404, description: 'Comercio no encontrado' })
  async findBySlug(@Param('slug') slug: string): Promise<PublicMerchantDto> {
    return this.merchantsService.findPublicBySlug(slug);
  }

  @Patch(':merchantId/slug')
  @ApiBearerAuth()
  @UseGuards(SupabaseAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Cambiar el link público del local (/join/:slug)',
    description:
      'Solo OWNER. El slug se normaliza en el backend. Cambiarlo invalida los QR ya impresos con el link anterior.',
  })
  @ApiResponse({ status: 200, description: 'Slug actualizado', type: UpdateSlugResponseDto })
  @ApiResponse({ status: 400, description: 'Slug inválido (largo o caracteres)' })
  @ApiResponse({ status: 403, description: 'El usuario no es OWNER del comercio' })
  @ApiResponse({ status: 409, description: 'El slug ya lo usa otro comercio' })
  async updateSlug(
    @Param('merchantId', new ParseUUIDPipe()) merchantId: string,
    @Body() dto: UpdateSlugDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<UpdateSlugResponseDto> {
    if (!user?.id) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.merchantsService.updateSlug(merchantId, dto.slug, user.id);
  }
}
