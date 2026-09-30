import {
  Body,
  Controller,
  Get,
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
import type { GeocodeResultDto, LocationDto } from '@fidelity/shared';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import {
  CreateLocationDto,
  GeocodeQueryDto,
  UpdateLocationDto,
} from './dto/location.dto.js';
import { GeocodingService } from './geocoding.service.js';
import { LocationsService } from './locations.service.js';

@ApiTags('Locations')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller()
export class LocationsController {
  constructor(
    private readonly locations: LocationsService,
    private readonly geocoding: GeocodingService,
  ) {}

  @Get('brands/:brandId/locations')
  @ApiOperation({
    summary: 'Sucursales de la marca (solo OWNER, marca activa)',
  })
  @ApiResponse({ status: 200, description: 'LocationDto[] (packages/shared)' })
  list(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LocationDto[]> {
    return this.locations.list(brandId, user.id);
  }

  @Post('brands/:brandId/locations')
  @ApiOperation({
    summary: 'Crear una sucursal. El slug se genera desde el nombre',
  })
  create(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Body() dto: CreateLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LocationDto> {
    return this.locations.create(brandId, user.id, dto);
  }

  @Patch('brands/:brandId/locations/:locationId')
  @ApiOperation({ summary: 'Editar o desactivar una sucursal' })
  update(
    @Param('brandId', new ParseUUIDPipe()) brandId: string,
    @Param('locationId', new ParseUUIDPipe()) locationId: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LocationDto> {
    return this.locations.update(brandId, user.id, locationId, dto);
  }

  @Get('geocode')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Buscar una dirección en Chile (proxy a OpenStreetMap)',
  })
  @ApiResponse({
    status: 503,
    description: 'El servicio de mapas no respondió',
  })
  geocode(@Query() query: GeocodeQueryDto): Promise<GeocodeResultDto[]> {
    return this.geocoding.search(query.q);
  }
}
