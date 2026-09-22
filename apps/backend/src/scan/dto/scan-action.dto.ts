import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ScanActionType {
  STAMP = 'STAMP',
  REDEEM = 'REDEEM',
}

export class ScanActionDto {
  @ApiProperty({
    description: 'Token criptográfico del código QR del pase escaneado',
    example: 'd9b73489e248bdfb1e8432b0c16922ef65e90d8a43f8e562308cf2b17f564344',
  })
  @IsString({ message: 'El passToken debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El passToken no puede estar vacío' })
  passToken: string;

  @ApiProperty({
    description: 'Acción a realizar: STAMP para agregar un sello, REDEEM para canjear un premio',
    enum: ScanActionType,
    example: ScanActionType.STAMP,
  })
  @IsEnum(ScanActionType, { message: 'La acción debe ser STAMP o REDEEM' })
  @IsNotEmpty({ message: 'La acción no puede estar vacía' })
  action: ScanActionType;

  @ApiProperty({
    description: 'ID del comercio que realiza el escaneo (UUID v4)',
    example: 'a0000000-0000-0000-0000-000000000001',
  })
  @IsUUID('4', { message: 'El merchantId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El merchantId no puede estar vacío' })
  merchantId: string;

  @ApiPropertyOptional({
    description: 'ID opcional de la promoción específica a aplicar (UUID v4)',
    example: 'p0000000-0000-0000-0000-000000000001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El promotionId debe ser un UUID v4 válido' })
  promotionId?: string;
}

export class MaskedCustomerDto {
  @ApiProperty({ description: 'ID del cliente' })
  id: string;

  @ApiPropertyOptional({ description: 'RUT enmascarado para privacidad en caja', example: '12.***.*78-5' })
  rut?: string | null;

  @ApiPropertyOptional({ description: 'Teléfono enmascarado para privacidad en caja', example: '+56 9 **** 5678' })
  phone?: string | null;
}

export class ScanResultDto {
  @ApiProperty({ description: 'Indica si el escaneo fue exitoso', example: true })
  success: boolean;

  @ApiProperty({
    description: 'Verdadero si el sello o canje duplicado fue ignorado dentro de la ventana antifraude de 90 segundos',
    example: false,
  })
  alreadyScanned: boolean;

  @ApiProperty({ description: 'Acción ejecutada', enum: ScanActionType, example: ScanActionType.STAMP })
  action: ScanActionType;

  @ApiProperty({ description: 'ID del pase (UUID)' })
  passId: string;

  @ApiProperty({ description: 'Cantidad actual de sellos activos, no expirados y no consumidos', example: 5 })
  activeStamps: number;

  @ApiProperty({ description: 'Meta de sellos requeridos para desbloquear el premio', example: 10 })
  targetStamps: number;

  @ApiProperty({ description: 'Verdadero si activeStamps >= targetStamps', example: false })
  rewardUnlocked: boolean;

  @ApiProperty({ description: 'Nombre del premio objetivo o desbloqueado', example: 'Café de especialidad gratis' })
  rewardName: string;

  @ApiPropertyOptional({ description: 'Fecha y hora del próximo vencimiento de sello, si existe' })
  nextExpiryAt?: Date | null;

  @ApiPropertyOptional({ description: 'ID del registro de Scan creado o coincidente (UUID)' })
  scanId?: string;

  @ApiPropertyOptional({ description: 'Cantidad de sellos consumidos en esta acción de canje' })
  consumedStampsCount?: number;

  @ApiPropertyOptional({ description: 'Datos enmascarados del cliente' })
  customer?: MaskedCustomerDto;

  @ApiPropertyOptional({ description: 'Mensaje descriptivo del resultado' })
  message?: string;
}
