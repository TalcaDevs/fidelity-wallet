import { ApiProperty } from '@nestjs/swagger';
import {
  OWNER_STAMP_REASON_MAX,
  OWNER_STAMP_REASON_MIN,
  type VoidScanDto,
  type VoidScanResultDto,
} from '@fidelity/shared';
import { Transform } from 'class-transformer';
import { IsString, IsUUID, Length } from 'class-validator';

const trimmedText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class VoidScanRequestDto implements VoidScanDto {
  @ApiProperty({ description: 'ID de la marca (UUID)', format: 'uuid' })
  @IsUUID('4', { message: 'El brandId debe ser un UUID v4 válido' })
  brandId: string;

  @ApiProperty({
    description: 'Motivo obligatorio de la anulación (queda registrado en AuditLog)',
    minLength: OWNER_STAMP_REASON_MIN,
    maxLength: OWNER_STAMP_REASON_MAX,
    example: 'Carga ingresada por error de tipeo en caja',
  })
  @Transform(trimmedText)
  @IsString({ message: 'Indica el motivo de la anulación' })
  @Length(OWNER_STAMP_REASON_MIN, OWNER_STAMP_REASON_MAX, {
    message: `El motivo debe tener entre ${OWNER_STAMP_REASON_MIN} y ${OWNER_STAMP_REASON_MAX} caracteres`,
  })
  reason: string;
}

export class VoidScanResponseDto implements VoidScanResultDto {
  @ApiProperty({ description: 'ID del escaneo/carga anulada', format: 'uuid' })
  scanId: string;

  @ApiProperty({ description: 'Fecha y hora en que se registró la anulación en formato ISO' })
  voidedAt: string;

  @ApiProperty({ description: 'Saldo activo de sellos tras la anulación' })
  activeStamps: number;

  @ApiProperty({ description: 'Saldo activo de puntos tras la anulación' })
  activePoints: number;

  @ApiProperty({ description: 'Cantidad de sellos descontados' })
  stampsDeducted: number;

  @ApiProperty({ description: 'Cantidad de puntos descontados' })
  pointsDeducted: number;
}
