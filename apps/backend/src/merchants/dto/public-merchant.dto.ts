import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicPromotionDto {
  @ApiProperty({ description: 'ID de la promoción', example: 'e4c08495-e224-4122-9f9f-e0117ab81cd7' })
  id: string;

  @ApiProperty({ description: 'Nombre de la promoción', example: 'Café gratis' })
  name: string;

  @ApiProperty({ description: 'Sellos necesarios para el premio', example: 5 })
  targetStamps: number;

  @ApiProperty({ description: 'Premio que se entrega', example: 'Café de especialidad' })
  rewardName: string;
}

export class PublicMerchantDto {
  @ApiProperty({
    description: 'ID del comercio (UUID). Es el que se usa para emitir el pase en POST /api/customers',
    example: 'd3b07384-d113-4011-8e8e-d9006fa70bc6',
  })
  id: string;

  @ApiProperty({ description: 'Nombre visible del comercio', example: 'Cafetería Central' })
  name: string;

  @ApiProperty({ description: 'Identificador público de la landing /join/:slug', example: 'cafeteria-central' })
  slug: string;

  @ApiPropertyOptional({
    description: 'Vigencia de los sellos en días. null = no vencen',
    example: 90,
    nullable: true,
    type: Number,
  })
  stampValidityDays: number | null;

  @ApiPropertyOptional({
    description: 'Promoción activa más reciente (la que se destaca). null si el comercio no tiene ninguna activa',
    type: PublicPromotionDto,
    nullable: true,
  })
  activePromotion: PublicPromotionDto | null;

  @ApiProperty({
    description:
      'Todas las promociones activas, de la más reciente a la más antigua. Los sellos del cliente sirven para cualquiera de ellas',
    type: [PublicPromotionDto],
  })
  activePromotions: PublicPromotionDto[];
}
