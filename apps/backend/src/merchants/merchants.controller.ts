import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PublicMerchantDto } from './dto/public-merchant.dto.js';
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
      'Endpoint público (sin sesión). Resuelve el slug al merchantId y a la promoción vigente. No expone el email del dueño.',
  })
  @ApiResponse({ status: 200, description: 'Comercio encontrado', type: PublicMerchantDto })
  @ApiResponse({ status: 404, description: 'Comercio no encontrado' })
  async findBySlug(@Param('slug') slug: string): Promise<PublicMerchantDto> {
    return this.merchantsService.findPublicBySlug(slug);
  }
}
