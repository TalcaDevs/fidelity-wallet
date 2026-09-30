import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  CATALOG_PLANS,
  REVEAL_REASON_MIN,
  type PlanId,
} from '@fidelity/shared';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

const PLAN_IDS = CATALOG_PLANS.map((p) => p.id);
const BRAND_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;
const trimmedOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class InternalPageQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 20;
}

export class ListBrandsQueryDto extends InternalPageQueryDto {
  @ApiPropertyOptional({
    description: 'Nombre de la marca o slug de alguno de sus locales',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  q?: string;

  @ApiPropertyOptional({ enum: BRAND_STATUSES })
  @IsOptional()
  @IsIn(BRAND_STATUSES)
  status?: (typeof BRAND_STATUSES)[number];

  @ApiPropertyOptional({ enum: PLAN_IDS })
  @IsOptional()
  @IsIn(PLAN_IDS)
  planId?: PlanId;
}

export class UpdateBrandDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(2, 80)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trimmedOrNull)
  @IsString()
  @Length(2, 120)
  legalName?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'RUT de la empresa' })
  @IsOptional()
  @Transform(trimmedOrNull)
  @IsString()
  @Length(3, 20)
  taxId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trimmedOrNull)
  @IsEmail()
  contactEmail?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trimmedOrNull)
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'El teléfono debe tener formato internacional',
  })
  contactPhone?: string | null;

  @ApiPropertyOptional({
    enum: BRAND_STATUSES,
    description: 'SUSPENDED = sin acceso (HANDOFF §8.12)',
  })
  @IsOptional()
  @IsIn(BRAND_STATUSES)
  status?: (typeof BRAND_STATUSES)[number];

  @ApiPropertyOptional({ enum: PLAN_IDS })
  @IsOptional()
  @IsIn(PLAN_IDS)
  planId?: PlanId;

  @ApiPropertyOptional({ description: 'Fin de la prueba (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  trialEndsAt?: string;

  @ApiPropertyOptional({ description: 'Motivo del cambio, queda en AuditLog' })
  @IsOptional()
  @IsString()
  @Length(3, 500)
  reason?: string;
}

export class ListLocationPinsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  brandId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 60)
  region?: string;
}

export class SearchCustomersQueryDto extends InternalPageQueryDto {
  @ApiPropertyOptional({
    description:
      'RUT o teléfono completo (no hay búsqueda parcial de datos personales)',
  })
  @IsOptional()
  @IsString()
  @Length(3, 30)
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  brandId?: string;
}

export class RevealCustomerDto {
  @ApiPropertyOptional({ minLength: REVEAL_REASON_MIN })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(REVEAL_REASON_MIN, 500, {
    message: `Explica el motivo en al menos ${REVEAL_REASON_MIN} caracteres: queda registrado`,
  })
  reason: string;
}

export class ListAuditQueryDto extends InternalPageQueryDto {
  @ApiPropertyOptional({ example: 'Brand' })
  @IsOptional()
  @IsString()
  @Length(2, 40)
  entity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 60)
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  actorUserId?: string;
}
