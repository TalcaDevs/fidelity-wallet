import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { ReportPeriodQueryDto, RetentionReportQueryDto } from './dto/reports-query.dto.js';
import {
  OverviewReportDto,
  PromotionPerformanceDto,
  RetentionReportDto,
  StaffActivityDto,
} from './dto/reports-response.dto.js';
import { ReportsService } from './reports.service.js';

@ApiTags('Reports & Analytics')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ---------------------------------------------------------------------------
  // Overview Report
  // ---------------------------------------------------------------------------

  @Get('brands/:brandId/reports/overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Métricas generales (Overview) del programa de lealtad a nivel de marca',
    description:
      'Retorna KPIs del período consolidados para toda la marca (o para una sucursal específica si se incluye merchantId en query). Solo para el OWNER.',
  })
  @ApiResponse({ status: 200, type: OverviewReportDto })
  @ApiResponse({ status: 400, description: 'Parámetros de fecha o zona horaria inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Solo el dueño puede consultar reportes' })
  @ApiResponse({ status: 404, description: 'Comercio no encontrado' })
  async getBrandOverview(
    @Param('brandId', new ParseUUIDPipe({ version: '4' })) brandId: string,
    @Query() query: ReportPeriodQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<OverviewReportDto> {
    if (!user?.id) throw new UnauthorizedException('Usuario no autenticado');
    return this.reportsService.getOverview(brandId, query, user.id, { preferBrand: true });
  }

  @Get('merchants/:merchantId/reports/overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Métricas generales (Overview) del programa de lealtad por sucursal',
    description:
      'Retorna KPIs del período comparados con el período anterior para un local específico. Solo para el OWNER.',
  })
  @ApiResponse({ status: 200, type: OverviewReportDto })
  @ApiResponse({ status: 400, description: 'Parámetros de fecha o zona horaria inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Solo el dueño puede consultar reportes' })
  @ApiResponse({ status: 404, description: 'Comercio no encontrado' })
  async getOverview(
    @Param('merchantId', new ParseUUIDPipe({ version: '4' })) merchantId: string,
    @Query() query: ReportPeriodQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<OverviewReportDto> {
    if (!user?.id) throw new UnauthorizedException('Usuario no autenticado');
    return this.reportsService.getOverview(merchantId, query, user.id, { preferBrand: false });
  }

  // ---------------------------------------------------------------------------
  // Retention Report
  // ---------------------------------------------------------------------------

  @Get('brands/:brandId/reports/retention')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reporte de retención, recurrencia y clientes dormidos a nivel de marca',
    description:
      'Retorna la retención semanal consolidada para la marca (o filtrada por sucursal si se incluye merchantId en query). Solo para el OWNER.',
  })
  @ApiResponse({ status: 200, type: RetentionReportDto })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Solo el dueño puede consultar reportes' })
  @ApiResponse({ status: 404, description: 'Comercio no encontrado' })
  async getBrandRetention(
    @Param('brandId', new ParseUUIDPipe({ version: '4' })) brandId: string,
    @Query() query: RetentionReportQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<RetentionReportDto> {
    if (!user?.id) throw new UnauthorizedException('Usuario no autenticado');
    return this.reportsService.getRetention(brandId, query, user.id, { preferBrand: true });
  }

  @Get('merchants/:merchantId/reports/retention')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reporte de retención, recurrencia y clientes dormidos por sucursal',
    description:
      'Retorna la retención semanal, distribución de frecuencia de visitas, listado de clientes dormidos y análisis de cohortes para un local específico. Solo para el OWNER.',
  })
  @ApiResponse({ status: 200, type: RetentionReportDto })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Solo el dueño puede consultar reportes' })
  @ApiResponse({ status: 404, description: 'Comercio no encontrado' })
  async getRetention(
    @Param('merchantId', new ParseUUIDPipe({ version: '4' })) merchantId: string,
    @Query() query: RetentionReportQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<RetentionReportDto> {
    if (!user?.id) throw new UnauthorizedException('Usuario no autenticado');
    return this.reportsService.getRetention(merchantId, query, user.id, { preferBrand: false });
  }

  // ---------------------------------------------------------------------------
  // Promotions Performance Report
  // ---------------------------------------------------------------------------

  @Get('brands/:brandId/reports/promotions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rendimiento y canjes por promoción a nivel de marca',
    description:
      'Retorna canjes por promoción consolidado para toda la marca (o para una sucursal si se especifica merchantId). Solo para el OWNER.',
  })
  @ApiResponse({ status: 200, type: PromotionPerformanceDto })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Solo el dueño puede consultar reportes' })
  @ApiResponse({ status: 404, description: 'Comercio no encontrado' })
  async getBrandPromotions(
    @Param('brandId', new ParseUUIDPipe({ version: '4' })) brandId: string,
    @Query() query: ReportPeriodQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PromotionPerformanceDto> {
    if (!user?.id) throw new UnauthorizedException('Usuario no autenticado');
    return this.reportsService.getPromotions(brandId, query, user.id, { preferBrand: true });
  }

  @Get('merchants/:merchantId/reports/promotions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rendimiento y canjes por promoción por sucursal',
    description:
      'Retorna canjes por promoción, días promedio hasta el canje y sellos vencidos sin utilizar (breakage). Solo para el OWNER.',
  })
  @ApiResponse({ status: 200, type: PromotionPerformanceDto })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Solo el dueño puede consultar reportes' })
  @ApiResponse({ status: 404, description: 'Comercio no encontrado' })
  async getPromotions(
    @Param('merchantId', new ParseUUIDPipe({ version: '4' })) merchantId: string,
    @Query() query: ReportPeriodQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<PromotionPerformanceDto> {
    if (!user?.id) throw new UnauthorizedException('Usuario no autenticado');
    return this.reportsService.getPromotions(merchantId, query, user.id, { preferBrand: false });
  }

  // ---------------------------------------------------------------------------
  // Staff Activity Report
  // ---------------------------------------------------------------------------

  @Get('brands/:brandId/reports/staff')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actividad de equipo, auditoría y alertas antifraude a nivel de marca',
    description:
      'Retorna la actividad del equipo de toda la marca (o de una sucursal si se especifica merchantId). Solo para el OWNER.',
  })
  @ApiResponse({ status: 200, type: StaffActivityDto })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Solo el dueño puede consultar reportes' })
  @ApiResponse({ status: 404, description: 'Comercio no encontrado' })
  async getBrandStaffActivity(
    @Param('brandId', new ParseUUIDPipe({ version: '4' })) brandId: string,
    @Query() query: ReportPeriodQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StaffActivityDto> {
    if (!user?.id) throw new UnauthorizedException('Usuario no autenticado');
    return this.reportsService.getStaffActivity(brandId, query, user.id, { preferBrand: true });
  }

  @Get('merchants/:merchantId/reports/staff')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actividad de equipo, auditoría y alertas antifraude por sucursal',
    description:
      'Retorna la actividad del equipo o personal (sellos, canjes, porcentaje manual) y alertas operativas/antifraude. Solo para el OWNER.',
  })
  @ApiResponse({ status: 200, type: StaffActivityDto })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Solo el dueño puede consultar reportes' })
  @ApiResponse({ status: 404, description: 'Comercio no encontrado' })
  async getStaffActivity(
    @Param('merchantId', new ParseUUIDPipe({ version: '4' })) merchantId: string,
    @Query() query: ReportPeriodQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StaffActivityDto> {
    if (!user?.id) throw new UnauthorizedException('Usuario no autenticado');
    return this.reportsService.getStaffActivity(merchantId, query, user.id, { preferBrand: false });
  }
}
