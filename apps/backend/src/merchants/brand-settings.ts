import {
  Body,
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
import { ProgramType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
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
}

export class UpdateBrandSettingsDto {
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

/** Lo que es de la marca y no de un local: su nombre y la vigencia de los sellos del programa. */
@Injectable()
export class BrandSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(brandId: string, userId: string): Promise<BrandSettingsDto> {
    await requireActiveBrandOwner(this.prisma, userId, brandId);
    return this.read(brandId);
  }

  /** Nombre y vigencia en una transacción: o se guardan los dos o ninguno. */
  async update(
    brandId: string,
    userId: string,
    dto: UpdateBrandSettingsDto,
  ): Promise<BrandSettingsDto> {
    await requireActiveBrandOwner(this.prisma, userId, brandId);
    await this.prisma.$transaction([
      ...(dto.name !== undefined
        ? [
            this.prisma.brand.update({
              where: { id: brandId },
              data: { name: dto.name },
            }),
          ]
        : []),
      ...(dto.stampValidityDays !== undefined
        ? [
            this.prisma.loyaltyProgram.updateMany({
              where: { brandId, type: ProgramType.STAMPS },
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
        programs: {
          where: { type: ProgramType.STAMPS },
          take: 1,
          select: { stampValidityDays: true },
        },
      },
    });
    return {
      name: brand.name,
      stampValidityDays: brand.programs[0]?.stampValidityDays ?? null,
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
    summary: 'Nombre de la marca y vigencia de los sellos (solo OWNER)',
  })
  get(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandSettingsDto> {
    return this.settings.get(brandId, user.id);
  }

  @Patch()
  @ApiOperation({
    summary: 'Editar nombre de la marca y vigencia de los sellos (solo OWNER)',
  })
  update(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Body() dto: UpdateBrandSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BrandSettingsDto> {
    return this.settings.update(brandId, user.id, dto);
  }
}
