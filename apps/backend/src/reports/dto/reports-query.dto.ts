import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsTimeZone, Max, Min } from 'class-validator';

export class ReportPeriodQueryDto {
  @ApiPropertyOptional({
    description: 'Fecha de inicio del rango (formato ISO 8601 o YYYY-MM-DD)',
    example: '2026-09-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'El parámetro "from" debe ser una fecha ISO válida' })
  from?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del rango (formato ISO 8601 o YYYY-MM-DD)',
    example: '2026-09-30',
  })
  @IsOptional()
  @IsDateString({}, { message: 'El parámetro "to" debe ser una fecha ISO válida' })
  to?: string;

  @ApiPropertyOptional({
    description: 'Zona horaria para la agregación de datos (por defecto: America/Santiago)',
    example: 'America/Santiago',
    default: 'America/Santiago',
  })
  @IsOptional()
  @IsTimeZone({ message: 'El parámetro "tz" debe ser una zona horaria IANA válida (ej: America/Santiago)' })
  tz?: string = 'America/Santiago';
}

export class RetentionReportQueryDto {
  @ApiPropertyOptional({
    description: 'Zona horaria para la agregación de datos (por defecto: America/Santiago)',
    example: 'America/Santiago',
    default: 'America/Santiago',
  })
  @IsOptional()
  @IsTimeZone({ message: 'El parámetro "tz" debe ser una zona horaria IANA válida (ej: America/Santiago)' })
  tz?: string = 'America/Santiago';

  @ApiPropertyOptional({
    description: 'Días de inactividad para considerar a un cliente como "dormido" (por defecto: 30)',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'dormantDays debe ser un número entero' })
  @Min(1, { message: 'dormantDays debe ser al menos 1 día' })
  @Max(365, { message: 'dormantDays no puede superar 365 días' })
  dormantDays?: number = 30;
}
