import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CARD_IMAGE_KINDS,
  CARD_TYPES,
  CARD_VALIDITY_TYPES,
  type CardImageKind,
  type CardType,
  type CardValidityType,
} from '@fidelity/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

// Forma del cuerpo: los tipos y rangos de negocio (largo del nombre, tope de sellos, enlaces,
// fechas futuras) los valida cardConfigProblems de @fidelity/shared, igual que el editor.

export class CardRewardDto {
  @ApiPropertyOptional({
    description: 'Id de la recompensa existente; ausente si es nueva',
  })
  @IsOptional()
  @IsUUID('4', { message: 'La recompensa no es válida' })
  id?: string;

  @ApiProperty({ example: 'Café gratis' })
  @IsString({ message: 'El nombre de la recompensa debe ser un texto' })
  name: string;

  @ApiProperty({
    description: 'Sellos o puntos que cuesta',
    example: 10,
    minimum: 1,
  })
  @IsInt({ message: 'Lo que cuesta cada recompensa debe ser un número entero' })
  @Min(1, { message: 'Cada recompensa debe costar al menos un sello o punto' })
  target: number;

  @ApiPropertyOptional({ enum: ['STAMPS', 'POINTS'] })
  @IsOptional()
  @IsIn(['STAMPS', 'POINTS'], { message: 'La moneda de la recompensa no es válida' })
  currency?: 'STAMPS' | 'POINTS';
}

export class CardValidityDto {
  @ApiProperty({ enum: CARD_VALIDITY_TYPES })
  @IsIn(CARD_VALIDITY_TYPES as string[], {
    message: 'La vigencia de la tarjeta no es válida',
  })
  type: CardValidityType;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Solo FIXED_DATE (ISO 8601)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de término no es válida' })
  expiresAt: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Solo AFTER_JOIN',
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Los días de vigencia deben ser un número entero' })
  @Min(1, { message: 'La tarjeta debe durar al menos un día' })
  days: number | null;
}

export class SaveCardDto {
  @ApiProperty({ enum: CARD_TYPES })
  @IsIn(CARD_TYPES as string[], { message: 'El tipo de tarjeta no es válido' })
  type: CardType;

  @ApiProperty()
  @IsBoolean()
  stampsEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  pointsEnabled: boolean;

  @ApiProperty({ example: 'Tarjeta Café Central' })
  @IsString({ message: 'El nombre de la tarjeta debe ser un texto' })
  name: string;

  @ApiProperty({ type: [CardRewardDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CardRewardDto)
  rewards: CardRewardDto[];

  @ApiProperty({
    description: 'Sellos o puntos al obtener la tarjeta',
    example: 0,
    minimum: 0,
  })
  @IsInt({ message: 'El saldo de bienvenida debe ser un número entero' })
  @Min(0, { message: 'El saldo de bienvenida no puede ser negativo' })
  welcomeBalance: number;

  @ApiProperty({
    description: 'Solo sellos: un sello por día y cliente para el STAFF',
  })
  @IsBoolean()
  dailyStampLimit: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Vigencia de cada sello o punto; null = no vencen',
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: 'La vigencia debe ser un número entero de días' })
  @Min(1, { message: 'La vigencia debe ser de al menos un día' })
  stampValidityDays: number | null;

  @ApiProperty({ type: CardValidityDto })
  @ValidateNested()
  @Type(() => CardValidityDto)
  validity: CardValidityDto;

  @ApiProperty({ description: 'RegistrationConfig de @fidelity/shared' })
  @IsObject()
  registration: Record<string, unknown>;

  @ApiProperty({ description: 'CardDesign de @fidelity/shared' })
  @IsObject()
  design: Record<string, unknown>;

  @ApiProperty({ description: 'CardDetails de @fidelity/shared' })
  @IsObject()
  details: Record<string, unknown>;
}

export class UploadCardImageDto {
  @ApiProperty({ enum: CARD_IMAGE_KINDS })
  @IsIn(CARD_IMAGE_KINDS as string[], {
    message: 'El tipo de imagen no es válido',
  })
  kind: CardImageKind;
}
