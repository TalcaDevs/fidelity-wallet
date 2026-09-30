import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ReportPeriodQueryDto {
  @ApiPropertyOptional({
    description: 'Fecha de inicio del rango (formato ISO 8601 o YYYY-MM-DD)',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'El parámetro "from" debe ser una fecha ISO válida' })
  from?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del rango (formato ISO 8601 o YYYY-MM-DD)',
    example: '2026-09-30T23:59:59.999Z',
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
  @IsString({ message: 'El parámetro "tz" debe ser un string de zona horaria válido' })
  tz?: string = 'America/Santiago';

  @ApiPropertyOptional({
    description: 'ID de la sucursal o local (opcional, para futura compatibilidad multi-local)',
    example: 'd3b07384-d113-4011-8e8e-d9006fa70bc6',
  })
  @IsOptional()
  @IsString()
  locationId?: string;
}

export class RetentionReportQueryDto extends ReportPeriodQueryDto {
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
