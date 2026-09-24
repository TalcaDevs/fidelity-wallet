import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

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

  @ApiProperty({
    description: 'Vigencia de los sellos en días. null = no vencen',
    example: 90,
    nullable: true,
    type: Number,
  })
  stampValidityDays: number | null;

  @ApiProperty({
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

export class UpdateSlugDto {
  @ApiProperty({
    description:
      'Nuevo identificador público de /join/:slug. Se normaliza (minúsculas, sin tildes, guiones) y debe tener entre 3 y 60 caracteres',
    example: 'cafe-central',
  })
  @IsString({ message: 'El slug debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El slug no puede estar vacío' })
  slug: string;
}

export class UpdateSlugResponseDto {
  @ApiProperty({ example: 'cafe-central' })
  slug: string;
}
