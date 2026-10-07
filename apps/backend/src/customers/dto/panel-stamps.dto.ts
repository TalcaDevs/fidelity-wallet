import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OWNER_STAMP_REASON_MAX,
  OWNER_STAMP_REASON_MIN,
  PURCHASE_AMOUNT_MAX,
  PURCHASE_NOTE_MAX,
} from '@fidelity/shared';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, MaxLength, Min } from 'class-validator';

// Llega en multipart/form-data cuando trae foto: un campo opcional vacío es "".
const optionalText = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  return text === '' ? undefined : text;
};
const optionalNumber = ({ value }: { value: unknown }) =>
  value === '' || value === null || value === undefined ? undefined : Number(value);

/** El dueño suma sellos desde la ficha del cliente, sin escanear en caja. */
export class PanelStampsDto {
  @ApiPropertyOptional({ enum: ['STAMPS', 'POINTS'], description: 'Obligatoria cuando ambas modalidades están activas' })
  @IsOptional()
  @IsIn(['STAMPS', 'POINTS'])
  currency?: 'STAMPS' | 'POINTS';

  @ApiProperty({ description: 'Marca del cliente (UUID)' })
  @IsUUID('4', { message: 'El brandId debe ser un UUID v4 válido' })
  brandId: string;

  @ApiPropertyOptional({
    description: 'Local al que se atribuye la carga. Por defecto, el local donde se registró el cliente',
  })
  @Transform(optionalText)
  @IsOptional()
  @IsUUID('4', { message: 'El local debe ser un UUID v4 válido' })
  merchantId?: string;

  @ApiProperty({ description: 'Sellos a sumar (tope OWNER_MAX_STAMPS_PER_LOAD, 10 por defecto)', example: 2 })
  @Transform(optionalNumber)
  @IsInt({ message: 'La cantidad de sellos debe ser un número entero' })
  @Min(1, { message: 'La cantidad de sellos debe ser al menos 1' })
  stampCount: number;

  @ApiProperty({ description: 'Motivo: siempre obligatorio, el cliente no está en caja. Queda en AuditLog' })
  @Transform(optionalText)
  @IsString({ message: 'Indica el motivo' })
  @Length(OWNER_STAMP_REASON_MIN, OWNER_STAMP_REASON_MAX, {
    message: `El motivo debe tener entre ${OWNER_STAMP_REASON_MIN} y ${OWNER_STAMP_REASON_MAX} caracteres`,
  })
  reason: string;

  @ApiPropertyOptional({ description: 'Monto de la compra en pesos chilenos. Solo se registra', example: 12500 })
  @Transform(optionalNumber)
  @IsOptional()
  @IsInt({ message: 'El monto debe ser un número entero de pesos' })
  @Min(0, { message: 'El monto no puede ser negativo' })
  @Max(PURCHASE_AMOUNT_MAX, { message: 'El monto es demasiado alto' })
  purchaseAmount?: number;

  @ApiPropertyOptional({ description: 'Nota libre' })
  @Transform(optionalText)
  @IsOptional()
  @IsString()
  @MaxLength(PURCHASE_NOTE_MAX, { message: `La nota no puede superar los ${PURCHASE_NOTE_MAX} caracteres` })
  note?: string;
}
