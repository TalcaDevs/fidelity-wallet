import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class GeneratePassDto {
  @ApiProperty({
    description: 'ID del cliente (UUID v4)',
    example: 'c0000000-0000-0000-0000-000000000001',
  })
  @IsUUID('4', { message: 'customerId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'customerId es requerido' })
  customerId: string;

  @ApiProperty({
    description: 'ID del comercio (UUID v4)',
    example: 'a0000000-0000-0000-0000-000000000001',
  })
  @IsUUID('4', { message: 'merchantId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'merchantId es requerido' })
  merchantId: string;

  @ApiPropertyOptional({
    description:
      'ID opcional de la promoción cuya meta y premio se muestran en el pase (UUID v4). No cambia el saldo: los sellos sirven para cualquier promoción activa',
    example: 'p0000000-0000-0000-0000-000000000001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'promotionId debe ser un UUID v4 válido' })
  promotionId?: string;
}

export class PassEmissionResponseDto {
  @ApiProperty({ description: 'ID del pase en la base de datos (UUID v4)' })
  passId: string;

  @ApiProperty({
    description: 'Token criptográfico único del pase',
    example: '9c5e7b23cf41d2f62b7ae109b85c21dfa0134812f8659103847e1bcde5a70921',
  })
  passToken: string;

  @ApiProperty({
    description: 'URL para descargar o añadir el pase a Apple Wallet (.pkpass)',
    example: 'http://localhost:3000/api/passes/token-xyz/apple',
  })
  appleWalletUrl: string;

  @ApiProperty({
    description: 'URL para guardar el pase en Google Wallet',
    example: 'https://pay.google.com/gp/v/save/eyJhbGci...',
  })
  googleWalletUrl: string;

  @ApiProperty({ description: 'Cantidad actual de sellos activos', example: 0 })
  activeStamps: number;

  @ApiProperty({ description: 'Meta de sellos requeridos para el premio', example: 10 })
  targetStamps: number;

  @ApiProperty({ description: 'Nombre del premio', example: 'Café Gratis' })
  rewardName: string;

  @ApiPropertyOptional({ description: 'Fecha del próximo vencimiento de sellos, si aplica' })
  nextExpiryAt?: Date | null;
}
