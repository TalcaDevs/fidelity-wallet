import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScanMethod } from '@prisma/client';
import {
  CARD_TYPES,
  type CardType,
  OWNER_STAMP_REASON_MAX,
  OWNER_STAMP_REASON_MIN,
  PURCHASE_AMOUNT_MAX,
  PURCHASE_NOTE_MAX,
} from '@fidelity/shared';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// En multipart/form-data un campo opcional vacío llega como "": se trata como ausente.
const optionalText = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  return text === '' ? undefined : text;
};
const optionalNumber = ({ value }: { value: unknown }) =>
  value === '' || value === null || value === undefined ? undefined : Number(value);

export enum ScanActionType {
  STAMP = 'STAMP',
  REDEEM = 'REDEEM',
}

const LOOKUP_REQUIRED = 'Debe indicar el RUT, el teléfono o el correo del cliente';

/**
 * Búsqueda manual del cliente en caja (cámara rota, poca luz, pantalla dañada).
 * Se exige al menos un identificador; si llegan varios, se busca por RUT, luego por teléfono.
 */
export class ScanCustomerLookupDto {
  @ApiPropertyOptional({ description: 'RUT chileno del cliente', example: '12.345.678-5' })
  @ValidateIf((o: ScanCustomerLookupDto) => !o.phone && !o.email)
  @IsString({ message: 'El RUT debe ser una cadena de texto' })
  @IsNotEmpty({ message: LOOKUP_REQUIRED })
  rut?: string;

  @ApiPropertyOptional({ description: 'Teléfono celular del cliente', example: '+56912345678' })
  @ValidateIf((o: ScanCustomerLookupDto) => !o.rut && !o.email)
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsNotEmpty({ message: LOOKUP_REQUIRED })
  phone?: string;

  @ApiPropertyOptional({ description: 'Correo del cliente', example: 'maria@gmail.com' })
  @ValidateIf((o: ScanCustomerLookupDto) => !o.rut && !o.phone)
  @IsString({ message: 'El correo debe ser una cadena de texto' })
  @IsNotEmpty({ message: LOOKUP_REQUIRED })
  email?: string;
}

/** A quién se valida en caja: el QR del pase o, en el ingreso manual, un dato del cliente. */
export class ScanValidateDto {
  @ApiPropertyOptional({
    description: 'Token del código QR del pase escaneado. Obligatorio salvo que se envíe customer',
    example: 'd9b73489e248bdfb1e8432b0c16922ef65e90d8a43f8e562308cf2b17f564344',
  })
  @ValidateIf((o: ScanValidateDto) => !o.customer)
  @IsString({ message: 'El passToken debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'Debe escanear el QR del pase o ingresar un dato del cliente' })
  passToken?: string;

  @ApiPropertyOptional({
    description: 'Ingreso manual: identifica el pase por RUT, teléfono o correo del cliente',
    type: ScanCustomerLookupDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScanCustomerLookupDto)
  customer?: ScanCustomerLookupDto;

  @ApiProperty({
    description: 'ID del local que realiza el escaneo (UUID v4)',
    example: 'd3b07384-d113-4011-8e8e-d9006fa70bc6',
  })
  @IsUUID('4', { message: 'El merchantId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El merchantId no puede estar vacío' })
  merchantId: string;
}

export class ScanActionDto {
  @ApiPropertyOptional({
    description:
      'Comprobante de POST /api/scan/validate (vence en 10 minutos). Es el camino de la PWA: reemplaza a passToken y customer',
  })
  @IsOptional()
  @IsString({ message: 'El comprobante de validación debe ser una cadena de texto' })
  validationToken?: string;

  @ApiPropertyOptional({
    description:
      'Token criptográfico del código QR del pase escaneado. Obligatorio salvo que se envíe validationToken o customer',
    example: 'd9b73489e248bdfb1e8432b0c16922ef65e90d8a43f8e562308cf2b17f564344',
  })
  @ValidateIf((o: ScanActionDto) => !o.customer && !o.validationToken)
  @IsString({ message: 'El passToken debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'Debe escanear el QR del pase o ingresar un dato del cliente' })
  passToken?: string;

  @ApiPropertyOptional({
    description: 'Ingreso manual: identifica el pase por RUT, teléfono o correo del cliente',
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
    example: 'd3b07384-d113-4011-8e8e-d9006fa70bc6',
  })
  @IsUUID('4', { message: 'El merchantId debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El merchantId no puede estar vacío' })
  merchantId: string;

  @ApiPropertyOptional({
    description:
      'Solo para REDEEM: la promoción que el cliente eligió canjear (UUID v4). Obligatorio si el comercio tiene más de una promoción activa. En STAMP se ignora: los sellos son un saldo único del pase',
    example: '6bceb0a8-147c-487e-89b8-a5820250bc9e',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El promotionId debe ser un UUID v4 válido' })
  promotionId?: string;

  @ApiPropertyOptional({
    description:
      'Solo STAMP y solo el OWNER: cuántos sellos cargar de una vez (tope OWNER_MAX_STAMPS_PER_LOAD, 10 por defecto). Más de uno exige reason. El STAFF siempre suma 1',
    example: 1,
  })
  @Transform(optionalNumber)
  @IsOptional()
  @IsInt({ message: 'La cantidad de sellos debe ser un número entero' })
  @Min(0, { message: 'La cantidad de sellos no puede ser negativa' })
  stampCount?: number;

  @ApiPropertyOptional({
    description:
      'Solo el OWNER: motivo de cargar varios sellos o de sellar dentro del bloqueo entre sellos. Queda en AuditLog',
  })
  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @Length(OWNER_STAMP_REASON_MIN, OWNER_STAMP_REASON_MAX, {
    message: `El motivo debe tener entre ${OWNER_STAMP_REASON_MIN} y ${OWNER_STAMP_REASON_MAX} caracteres`,
  })
  reason?: string;

  @ApiPropertyOptional({
    description:
      'Solo STAMP: monto de la compra en pesos chilenos. Con tarjeta de puntos es obligatorio y define los puntos; con sellos solo se registra',
    example: 12500,
  })
  @Transform(optionalNumber)
  @IsOptional()
  @IsInt({ message: 'El monto debe ser un número entero de pesos' })
  @Min(0, { message: 'El monto no puede ser negativo' })
  @Max(PURCHASE_AMOUNT_MAX, { message: 'El monto es demasiado alto' })
  purchaseAmount?: number;

  @ApiPropertyOptional({ description: 'Solo STAMP: nota libre sobre la compra' })
  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @MaxLength(PURCHASE_NOTE_MAX, {
    message: `La nota no puede superar los ${PURCHASE_NOTE_MAX} caracteres`,
  })
  note?: string;
}

export class PromotionOptionDto {
  @ApiProperty({ description: 'ID de la promoción' })
  id: string;

  @ApiProperty({ description: 'Nombre de la promoción', example: 'Café gratis' })
  name: string;

  @ApiProperty({ description: 'Premio que entrega', example: 'Café de especialidad' })
  rewardName: string;

  @ApiProperty({ description: 'Sellos o Puntos que consume al canjearla', example: 5 })
  targetStamps: number;

  @ApiProperty({ description: 'Moneda requerida (STAMPS o POINTS)' })
  currency: 'STAMPS' | 'POINTS';

  @ApiProperty({ description: 'Verdadero si el saldo actual del pase alcanza para canjearla' })
  canRedeem: boolean;
}

/** Datos del cliente para la caja: primer nombre e identificadores enmascarados, sin el id interno. */
export class MaskedCustomerDto {
  @ApiPropertyOptional({ description: 'Primer nombre del cliente, si lo dio', example: 'María' })
  firstName?: string | null;

  @ApiPropertyOptional({ description: 'Correo enmascarado', example: 'm***@gmail.com' })
  email?: string | null;

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

  @ApiPropertyOptional({
    description: 'Método utilizado para resolver el pase: QR o MANUAL',
    enum: ScanMethod,
    example: ScanMethod.QR,
  })
  method?: ScanMethod;

  @ApiProperty({ description: 'ID del pase (UUID)' })
  passId: string;

  @ApiProperty({
    description: 'Saldo del pase: sellos vigentes y no consumidos. Sirven para cualquier promoción activa',
    example: 5,
  })
  activeStamps: number;

  @ApiProperty({
    description: 'Saldo del pase: puntos vigentes y no consumidos.',
    example: 100,
  })
  activePoints: number;

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

  @ApiPropertyOptional({ description: 'Sellos sumados en esta acción (STAMP no bloqueado)' })
  stampsAdded?: number;

  @ApiPropertyOptional({ description: 'Puntos sumados en esta acción (STAMP no bloqueado)' })
  pointsAdded?: number;

  @ApiPropertyOptional({ description: 'Datos enmascarados del cliente' })
  customer?: MaskedCustomerDto;

  @ApiPropertyOptional({ description: 'Mensaje descriptivo del resultado' })
  message?: string;
}

export class ScanValidationDto {
  @ApiProperty({
    description:
      'Comprobante para POST /api/scan (validationToken). Vence en 10 minutos y solo sirve para este usuario y local',
  })
  validationToken: string;

  @ApiProperty({ description: 'Vencimiento del comprobante' })
  expiresAt: Date;

  @ApiProperty({ enum: ScanMethod, description: 'Cómo se identificó al cliente' })
  method: ScanMethod;

  @ApiProperty({ description: 'ID del pase (UUID)' })
  passId: string;

  @ApiProperty({ type: MaskedCustomerDto })
  customer: MaskedCustomerDto;

  @ApiProperty({ description: 'Saldo del pase: sellos vigentes y no consumidos', example: 4 })
  activeStamps: number;

  @ApiProperty({ description: 'Saldo del pase: puntos vigentes y no consumidos', example: 100 })
  activePoints: number;

  @ApiProperty({ description: 'Meta de la promoción activa más reciente', example: 10 })
  targetStamps: number;

  @ApiProperty({ description: 'Premio de la promoción activa más reciente' })
  rewardName: string;

  @ApiProperty({ description: 'Verdadero si el saldo alcanza para canjear al menos una promoción' })
  rewardUnlocked: boolean;

  @ApiProperty({ type: [PromotionOptionDto] })
  availablePromotions: PromotionOptionDto[];

  @ApiPropertyOptional({ description: 'Fecha y hora del próximo vencimiento de sello, si existe' })
  nextExpiryAt?: Date | null;

  @ApiProperty({
    description: 'Si el pase está en el bloqueo entre sellos: desde cuándo puede volver a sumar',
    nullable: true,
    type: Date,
  })
  nextStampAvailableAt: Date | null;

  @ApiProperty({
    description:
      'Verdadero si quien escanea puede sumar ahora. El STAFF no puede durante el bloqueo; el OWNER sí, con motivo',
  })
  canStamp: boolean;

  @ApiProperty({ description: 'Máximo de sellos por carga: 1 para el STAFF', example: 1 })
  maxStampsPerLoad: number;

  @ApiProperty({
    description: 'Verdadero si sumar ahora exige motivo (OWNER dentro del bloqueo entre sellos)',
  })
  reasonRequired: boolean;

  @ApiProperty({
    description: 'Si el pase está en el bloqueo de puntos: desde cuándo puede volver a sumar puntos',
    nullable: true,
    type: Date,
  })
  nextPointsAvailableAt?: Date | null;

  @ApiProperty({
    description: 'Verdadero si quien escanea puede sumar puntos ahora. El STAFF no puede durante el bloqueo; el OWNER sí, con motivo',
  })
  canAddPoints?: boolean;

  @ApiProperty({
    description: 'Verdadero si sumar puntos ahora exige motivo (OWNER dentro del bloqueo de puntos)',
  })
  pointsReasonRequired?: boolean;

  @ApiProperty({ enum: CARD_TYPES, description: 'Tarjeta de sellos (por visita) o de puntos (por monto)' })
  cardType: CardType;

  @ApiProperty({ description: 'Verdadero si el programa permite sumar sellos por visita' })
  stampsEnabled: boolean;

  @ApiProperty({ description: 'Verdadero si el programa permite sumar puntos por compra' })
  pointsEnabled: boolean;

  @ApiProperty({ description: 'Pesos de compra por cada punto (solo se usa con puntos)', example: 1000 })
  pesosPerPoint: number;

  @ApiProperty({ description: 'Con puntos el monto es obligatorio: define los puntos' })
  amountRequired: boolean;

  @ApiProperty({ description: 'Con puntos el STAFF debe adjuntar la foto de la boleta' })
  receiptRequired: boolean;
}
