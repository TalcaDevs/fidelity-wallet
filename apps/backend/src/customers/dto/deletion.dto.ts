import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class DeleteCustomerResponseDto {
  @ApiProperty({ example: true, description: 'Indica si la eliminación se completó con éxito' })
  success: boolean;

  @ApiProperty({ example: 'Datos y pase del cliente eliminados exitosamente' })
  message: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica si el registro Customer fue borrado por completo de la base de datos',
  })
  customerCompletelyDeleted?: boolean;
}

export class RequestDeletionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'ID del comercio' })
  @IsUUID('4', { message: 'merchantId debe ser un UUID v4 válido' })
  merchantId: string;

  @ApiPropertyOptional({ example: '12.345.678-5', description: 'RUT del cliente' })
  @IsOptional()
  @IsString()
  rut?: string;

  @ApiPropertyOptional({ example: '+56912345678', description: 'Teléfono celular del cliente' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class RequestDeletionResponseDto {
  @ApiProperty({ example: true, description: 'Indica si el código fue enviado exitosamente' })
  success: boolean;

  @ApiProperty({ example: 'Código de confirmación de eliminación enviado por SMS' })
  message: string;

  @ApiProperty({ example: '+56 9 **** 5678' })
  phoneMasked: string;
}

export class VerifyDeletionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'ID del comercio' })
  @IsUUID('4', { message: 'merchantId debe ser un UUID v4 válido' })
  merchantId: string;

  @ApiPropertyOptional({ example: '12.345.678-5', description: 'RUT del cliente' })
  @IsOptional()
  @IsString()
  rut?: string;

  @ApiPropertyOptional({ example: '+56912345678', description: 'Teléfono celular del cliente' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '123456', description: 'Código OTP de 6 dígitos numéricos recibido por SMS' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código de verificación debe ser de 6 dígitos numéricos' })
  code: string;
}
