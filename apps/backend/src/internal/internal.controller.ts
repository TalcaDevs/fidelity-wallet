import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type {
  AuditLogEntryDto,
  InternalBrandDetailDto,
  InternalBrandSummaryDto,
  InternalCustomerDto,
  InternalLocationPinDto,
  InternalSummaryDto,
  LocationDto,
  Paginated,
  PlatformMeDto,
  RevealedCustomerDto,
} from '@fidelity/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  PlatformAdminGuard,
  PlatformRoles,
  type PlatformAdminUser,
} from '../common/guards/platform-admin.guard.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { UpdateLocationDto } from '../locations/dto/location.dto.js';
import {
  ListAuditQueryDto,
  ListBrandsQueryDto,
  ListLocationPinsQueryDto,
  RevealCustomerDto,
  SearchCustomersQueryDto,
  UpdateBrandDto,
} from './dto/internal.dto.js';
import { InternalBrandsService } from './internal-brands.service.js';
import { InternalCustomersService } from './internal-customers.service.js';
import { InternalLocationsService } from './internal-locations.service.js';
import { InternalSummaryService } from './internal-summary.service.js';

/** Lectura para todo el equipo interno; escrituras, datos completos y auditoría solo SUPERADMIN. */
@ApiTags('Internal')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, PlatformAdminGuard)
@PlatformRoles('SUPERADMIN', 'SUPPORT')
@ApiResponse({
  status: 403,
  description: 'No es PlatformAdmin o su rol no alcanza',
})
@Controller('internal')
export class InternalController {
  constructor(
    private readonly brands: InternalBrandsService,
    private readonly customers: InternalCustomersService,
    private readonly locations: InternalLocationsService,
    private readonly summaries: InternalSummaryService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Rol del admin interno de la sesión' })
  me(@CurrentUser() user: PlatformAdminUser): PlatformMeDto {
    return {
      userId: user.id,
      email: user.email ?? null,
      role: user.platformRole,
    };
  }

  @Get('summary')
  @ApiOperation({
    summary:
      'Resumen de la plataforma: marcas, pruebas por vencer, tickets y actividad',
  })
  summary(): Promise<InternalSummaryDto> {
    return this.summaries.summary();
  }

  @Get('brands')
  @ApiOperation({ summary: 'Marcas con plan, estado, uso y tickets abiertos' })
  listBrands(
    @Query() query: ListBrandsQueryDto,
  ): Promise<Paginated<InternalBrandSummaryDto>> {
    return this.brands.list(query);
  }

  @Get('brands/:brandId')
  @ApiOperation({
    summary:
      'Detalle de una marca: locales, programas, equipo, suscripción y actividad',
  })
  getBrand(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
  ): Promise<InternalBrandDetailDto> {
    return this.brands.get(brandId);
  }

  @Patch('brands/:brandId')
  @PlatformRoles('SUPERADMIN')
  @ApiOperation({
    summary: 'Editar datos, plan o estado de una marca (queda en AuditLog)',
  })
  updateBrand(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Body() dto: UpdateBrandDto,
    @CurrentUser() user: PlatformAdminUser,
  ): Promise<InternalBrandDetailDto> {
    return this.brands.update(brandId, user.id, dto);
  }

  @Patch('locations/:locationId')
  @PlatformRoles('SUPERADMIN')
  @ApiOperation({ summary: 'Editar o desactivar un local (queda en AuditLog)' })
  updateLocation(
    @Param('locationId', new ParseUUIDPipe()) locationId: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: PlatformAdminUser,
  ): Promise<LocationDto> {
    return this.locations.update(locationId, user.id, dto);
  }

  @Get('locations')
  @ApiOperation({ summary: 'Locales con coordenadas, para el mapa' })
  locationPins(
    @Query() query: ListLocationPinsQueryDto,
  ): Promise<InternalLocationPinDto[]> {
    return this.locations.pins(query);
  }

  @Get('customers')
  @ApiOperation({
    summary:
      'Buscar clientes por RUT o teléfono exactos, o por marca. Siempre enmascarados',
  })
  searchCustomers(
    @Query() query: SearchCustomersQueryDto,
  ): Promise<Paginated<InternalCustomerDto>> {
    return this.customers.search(query);
  }

  @Post('customers/:customerId/reveal')
  @HttpCode(HttpStatus.OK)
  @PlatformRoles('SUPERADMIN')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Ver RUT y teléfono completos. Exige motivo y queda en AuditLog (Ley 19.628)',
  })
  revealCustomer(
    @Param('customerId', new ParseUUIDPipe()) customerId: string,
    @Body() dto: RevealCustomerDto,
    @CurrentUser() user: PlatformAdminUser,
  ): Promise<RevealedCustomerDto> {
    return this.customers.reveal(customerId, user.id, dto.reason);
  }

  @Get('audit')
  @PlatformRoles('SUPERADMIN')
  @ApiOperation({ summary: 'Registro de auditoría' })
  audit(
    @Query() query: ListAuditQueryDto,
  ): Promise<Paginated<AuditLogEntryDto>> {
    return this.customers.audit(query);
  }
}
