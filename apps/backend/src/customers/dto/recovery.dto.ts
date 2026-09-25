import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

export class RequestRecoveryDto {
  @ApiProperty({
    description: 'ID del comercio donde se encuentra registrado el pase (UUID v4)',
    example: 'd3b07384-d113-4011-8e8e-d9006fa70bc6',
  })
  @IsUUID('4', { message: 'El merchantId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El merchantId no puede estar vacío' })
  merchantId: string;

  @ApiProperty({
    description: 'RUT chileno del cliente (con o sin puntos/guión)',
    example: '12.345.678-5',
  })
  @IsString({ message: 'El RUT debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'Debe ingresar su RUT' })
  rut: string;

  @ApiProperty({
    description: 'Teléfono celular chileno del cliente registrado',
    example: '+56912345678',
  })
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'Debe ingresar su teléfono' })
  phone: string;
}

export class RequestRecoveryResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Se ha enviado un código de verificación por SMS a tu teléfono' })
  message: string;

  @ApiProperty({ example: '+56 9 **** 5678' })
  phoneMasked: string;

  @ApiPropertyOptional({
    description: 'Código de verificación disponible solo en entornos de desarrollo/testeo local',
    example: '123456',
  })
  devCode?: string;
}

export class VerifyRecoveryDto {
  @ApiProperty({
    description: 'ID del comercio donde se encuentra registrado el pase (UUID v4)',
    example: 'd3b07384-d113-4011-8e8e-d9006fa70bc6',
  })
  @IsUUID('4', { message: 'El merchantId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El merchantId no puede estar vacío' })
  merchantId: string;

  @ApiProperty({
    description: 'RUT chileno del cliente',
    example: '12.345.678-5',
  })
  @IsString({ message: 'El RUT debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'Debe ingresar su RUT' })
  rut: string;

  @ApiProperty({
    description: 'Teléfono celular chileno del cliente registrado',
    example: '+56912345678',
  })
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'Debe ingresar su teléfono' })
  phone: string;

  @ApiProperty({
    description: 'Código de 6 dígitos numéricos recibido por SMS',
    example: '123456',
  })
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @Matches(/^\d{6}$/, { message: 'El código debe ser de 6 dígitos numéricos' })
  code: string;
}

export class VerifyRecoveryResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'c0000000-0000-0000-0000-000000000001' })
  customerId: string;

  @ApiProperty({ example: 'p0000000-0000-0000-0000-000000000001' })
  passId: string;

  @ApiPropertyOptional({ example: 'https://api.fidelity.cl/api/passes/token123/apple' })
  appleWalletUrl?: string;

  @ApiPropertyOptional({ example: 'https://pay.google.com/gp/v/save/jwt123' })
  googleWalletUrl?: string;

  @ApiProperty({ example: '¡Tarjeta recuperada exitosamente!' })
  message: string;
}
