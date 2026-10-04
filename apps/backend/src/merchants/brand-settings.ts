import {
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { PESOS_PER_POINT_MAX, PESOS_PER_POINT_MIN } from '@fidelity/shared';
import { ProgramType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { requireActiveBrandOwner } from '../common/access/brand-access.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface BrandSettingsDto {
  name: string;
  stampValidityDays: number | null;
  pointsEnabled: boolean;
  pesosPerPoint: number;
}

const POINTS_IN_USE =
  'Tu tarjeta es de puntos: cámbiala a sellos en Tarjeta antes de deshabilitar los puntos';

/** Los puntos no se pueden apagar con la tarjeta de la marca funcionando con puntos. */
export async function assertPointsCanBeDisabled(
  db: Pick<PrismaService, 'loyaltyProgram'>,
  brandId: string,
): Promise<void> {
  const pointsCard = await db.loyaltyProgram.findFirst({
    where: { brandId, type: ProgramType.POINTS },
    select: { id: true },
  });
  if (pointsCard) throw new ConflictException(POINTS_IN_USE);
}

export class PointsSettingsFields {
  @ApiPropertyOptional({ description: 'Habilita las tarjetas de puntos para la marca' })
  @IsOptional()
  @IsBoolean({ message: 'pointsEnabled debe ser verdadero o falso' })
  pointsEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Pesos de compra por cada punto', example: 1000 })
  @IsOptional()
  @IsInt({ message: 'Los pesos por punto deben ser un número entero' })
  @Min(PESOS_PER_POINT_MIN, { message: 'Cada punto debe valer al menos $1' })
  @Max(PESOS_PER_POINT_MAX, { message: 'Los pesos por punto son demasiado altos' })
  pesosPerPoint?: number;
}

export class UpdateBrandSettingsDto extends PointsSettingsFields {
  @ApiPropertyOptional({ example: 'Café Demo' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(2, 80, {
    message: 'El nombre de la marca debe tener entre 2 y 80 caracteres',
  })
  name?: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Días de vigencia de cada sello; null = no vencen',
  })
  @IsOptional()
  @IsInt({ message: 'La vigencia debe ser un número entero de días' })
  @Min(1)
  @Max(3650)
  stampValidityDays?: number | null;
}

/** Lo que es de la marca y no de un local: su nombre, la vigencia de los sellos y los puntos. */
@Injectable()
export class BrandSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(brandId: string, userId: string): Promise<BrandSettingsDto> {
    await requireActiveBrandOwner(this.prisma, userId, brandId);
    return this.read(brandId);
  }

  /** Todo en una transacción: o se guarda todo o nada. */
  async update(
    brandId: string,
    userId: string,
    dto: UpdateBrandSettingsDto,
  ): Promise<BrandSettingsDto> {
    await requireActiveBrandOwner(this.prisma, userId, brandId);
    if (dto.pointsEnabled === false) {
      await assertPointsCanBeDisabled(this.prisma, brandId);
    }
    const brandData = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.pointsEnabled !== undefined ? { pointsEnabled: dto.pointsEnabled } : {}),
      ...(dto.pesosPerPoint !== undefined ? { pesosPerPoint: dto.pesosPerPoint } : {}),
    };
    await this.prisma.$transaction([
      ...(Object.keys(brandData).length > 0
        ? [
            this.prisma.brand.update({
              where: { id: brandId },
              data: brandData,
            }),
          ]
        : []),
      ...(dto.stampValidityDays !== undefined
        ? [
            this.prisma.loyaltyProgram.updateMany({
              where: { brandId },
              data: { stampValidityDays: dto.stampValidityDays },
            }),
          ]
        : []),
    ]);
    return this.read(brandId);
  }

  private async read(brandId: string): Promise<BrandSettingsDto> {
    const brand = await this.prisma.brand.findUniqueOrThrow({
      where: { id: brandId },
      select: {
        name: true,
        pointsEnabled: true,
        pesosPerPoint: true,
        programs: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { stampValidityDays: true },
        },
      },
    });
    return {
      name: brand.name,
      stampValidityDays: brand.programs[0]?.stampValidityDays ?? null,
      pointsEnabled: brand.pointsEnabled,
      pesosPerPoint: brand.pesosPerPoint,
    };
  }
}

@ApiTags('Merchants & Staff')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('brands/:brandId/settings')
export class BrandSettingsController {
  constructor(private readonly settings: BrandSettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Nombre de la marca, vigencia de los sellos y puntos (solo OWNER)',
  })
  get(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandSettingsDto> {
    return this.settings.get(brandId, user.id);
  }

  @Patch()
  @ApiOperation({
    summary: 'Editar nombre de la marca, vigencia de los sellos y puntos (solo OWNER)',
  })
  update(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Body() dto: UpdateBrandSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandSettingsDto> {
    return this.settings.update(brandId, user.id, dto);
  }
}
