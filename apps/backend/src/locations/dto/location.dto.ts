import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CHILE_REGIONS } from '@fidelity/shared';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

const trimmedOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

/** Campos de un local; en los opcionales, `null` borra el valor. */
export class CreateLocationDto {
  @ApiProperty({ example: 'Café Demo — Providencia' })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(2, 80, {
    message: 'El nombre del local debe tener entre 2 y 80 caracteres',
  })
  name: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trimmedOrNull)
  @IsString()
  @Length(3, 200)
  address?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trimmedOrNull)
  @IsString()
  @Length(2, 80)
  commune?: string | null;

  @ApiPropertyOptional({ nullable: true, enum: CHILE_REGIONS })
  @IsOptional()
  @Transform(trimmedOrNull)
  @IsIn(CHILE_REGIONS, { message: 'Selecciona una región de Chile' })
  region?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsLatitude()
  latitude?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsLongitude()
  longitude?: number | null;

  @ApiPropertyOptional({ nullable: true, example: '+56223456789' })
  @IsOptional()
  @Transform(trimmedOrNull)
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message:
      'El teléfono debe tener formato internacional, por ejemplo +56223456789',
  })
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trimmedOrNull)
  @IsString()
  @Length(2, 80)
  contactName?: string | null;
}

export class UpdateLocationDto extends PartialType(CreateLocationDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GeocodeQueryDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(3, 200, { message: 'Escribe al menos 3 caracteres de la dirección' })
  q: string;
}
