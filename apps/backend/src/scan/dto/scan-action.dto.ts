import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export enum ScanActionType {
  STAMP = 'STAMP',
  REDEEM = 'REDEEM',
}

/**
 * Búsqueda manual del cliente en caja (cámara rota, poca luz, pantalla dañada).
 * Se exige exactamente uno de los dos identificadores.
 */
export class ScanCustomerLookupDto {
  @ApiPropertyOptional({ description: 'RUT chileno del cliente', example: '12.345.678-5' })
  @ValidateIf((o: ScanCustomerLookupDto) => !o.phone)
  @IsString({ message: 'El RUT debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'Debe indicar el RUT o el teléfono del cliente' })
  rut?: string;

  @ApiPropertyOptional({ description: 'Teléfono celular del cliente', example: '+56912345678' })
  @ValidateIf((o: ScanCustomerLookupDto) => !o.rut)
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'Debe indicar el RUT o el teléfono del cliente' })
  phone?: string;
}

export class ScanActionDto {
  @ApiPropertyOptional({
    description:
      'Token criptográfico del código QR del pase escaneado. Obligatorio salvo que se envíe customer (ingreso manual)',
    example: 'd9b73489e248bdfb1e8432b0c16922ef65e90d8a43f8e562308cf2b17f564344',
  })
  @ValidateIf((o: ScanActionDto) => !o.customer)
  @IsString({ message: 'El passToken debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'Debe escanear el QR del pase o ingresar el RUT/teléfono del cliente' })
  passToken?: string;

  @ApiPropertyOptional({
    description: 'Ingreso manual: identifica el pase por RUT o teléfono del cliente en este comercio',
    type: ScanCustomerLookupDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScanCustomerLookupDto)
  customer?: ScanCustomerLookupDto;

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
    description:
      'Solo para REDEEM: la promoción que el cliente eligió canjear (UUID v4). Obligatorio si el comercio tiene más de una promoción activa. En STAMP se ignora: los sellos son un saldo único del pase',
    example: 'p0000000-0000-0000-0000-000000000001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El promotionId debe ser un UUID v4 válido' })
  promotionId?: string;
}

export class PromotionOptionDto {
  @ApiProperty({ description: 'ID de la promoción' })
  id: string;

  @ApiProperty({ description: 'Nombre de la promoción', example: 'Café gratis' })
  name: string;

  @ApiProperty({ description: 'Premio que entrega', example: 'Café de especialidad' })
  rewardName: string;

  @ApiProperty({ description: 'Sellos que consume al canjearla', example: 5 })
  targetStamps: number;

  @ApiProperty({ description: 'Verdadero si el saldo actual del pase alcanza para canjearla' })
  canRedeem: boolean;
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
    description:
      'Verdadero si el escaneo fue ignorado: el pase ya recibió un sello dentro del bloqueo antifraude (30 min por defecto) o el canje se repitió dentro de 90 segundos',
    example: false,
  })
  alreadyScanned: boolean;

  @ApiProperty({ description: 'Acción ejecutada', enum: ScanActionType, example: ScanActionType.STAMP })
  action: ScanActionType;

  @ApiProperty({ description: 'ID del pase (UUID)' })
  passId: string;

  @ApiProperty({
    description: 'Saldo del pase: sellos vigentes y no consumidos. Sirven para cualquier promoción activa',
    example: 5,
  })
  activeStamps: number;

  @ApiProperty({
    description:
      'Meta de la promoción de referencia: en STAMP, la promoción activa más reciente (la que muestran la landing y el pase); en REDEEM, la canjeada',
    example: 10,
  })
  targetStamps: number;

  @ApiProperty({
    description: 'Verdadero si el saldo alcanza para canjear al menos una promoción activa',
    example: false,
  })
  rewardUnlocked: boolean;

  @ApiProperty({
    description: 'Premio de la promoción de referencia (ver targetStamps)',
    example: 'Café de especialidad gratis',
  })
  rewardName: string;

  @ApiProperty({
    description:
      'Todas las promociones activas del comercio, de la más reciente a la más antigua, indicando si el saldo alcanza. El cliente elige cuál canjear',
    type: [PromotionOptionDto],
  })
  availablePromotions: PromotionOptionDto[];

  @ApiPropertyOptional({ description: 'Fecha y hora del próximo vencimiento de sello, si existe' })
  nextExpiryAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Solo en un sello bloqueado: desde cuándo el pase puede volver a sumar un sello',
    nullable: true,
  })
  nextStampAvailableAt?: Date | null;

  @ApiPropertyOptional({ description: 'ID del registro de Scan creado o coincidente (UUID)' })
  scanId?: string;

  @ApiPropertyOptional({ description: 'Cantidad de sellos consumidos en esta acción de canje' })
  consumedStampsCount?: number;

  @ApiPropertyOptional({ description: 'Datos enmascarados del cliente' })
  customer?: MaskedCustomerDto;

  @ApiPropertyOptional({ description: 'Mensaje descriptivo del resultado' })
  message?: string;
}
