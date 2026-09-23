import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'ID único del comercio en formato UUID',
    example: 'd3b07384-d113-4011-8e8e-d9006fa70bc6',
  })
  @IsUUID('4', { message: 'El merchantId debe ser un UUID v4 válido' })
  merchantId: string;

  @ApiPropertyOptional({
    description: 'RUT chileno del cliente (con o sin puntos/guion)',
    example: '12.345.678-5',
  })
  @IsOptional()
  @IsString({ message: 'El RUT debe ser una cadena de texto' })
  rut?: string;

  @ApiPropertyOptional({
    description: 'Teléfono celular del cliente',
    example: '+56912345678',
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  phone?: string;
}

export class CustomerResponseDto {
  @ApiProperty({
    description: 'ID del cliente registrado',
    example: 'd3b07384-d113-4011-8e8e-d9006fa70bc6',
  })
  customerId: string;

  @ApiProperty({
    description: 'ID del pase emitido para este comercio',
    example: 'e4c08495-e224-4122-9f9f-e0117ab81cd7',
  })
  passId: string;

  @ApiProperty({
    description: 'Indica si el cliente o pase es nuevo o ya existía',
    example: true,
  })
  isNew: boolean;

  @ApiPropertyOptional({
    description: 'URL para descargar el pase en Apple Wallet (.pkpass)',
    example: '/api/passes/e4c08495-e224-4122-9f9f-e0117ab81cd7/apple',
  })
  appleWalletUrl?: string;

  @ApiPropertyOptional({
    description: 'URL para guardar el pase en Google Wallet',
    example: 'https://pay.google.com/gp/v/save/...',
  })
  googleWalletUrl?: string;
}

