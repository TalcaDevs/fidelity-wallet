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

  @Get([
    'merchants/:merchantId/reports/overview',
    'brands/:merchantId/reports/overview',
  ])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Métricas generales (Overview) del programa de lealtad',
    description:
      'Retorna KPIs del período comparados con el período anterior (clientes nuevos, activos, sellos, canjes, recurrencia, vencimientos), evolución diaria y distribución de métodos (QR vs Manual). Solo para el OWNER.',
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
    return this.reportsService.getOverview(merchantId, query, user.id);
  }

  @Get([
    'merchants/:merchantId/reports/retention',
    'brands/:merchantId/reports/retention',
  ])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reporte de retención, recurrencia y clientes dormidos',
    description:
      'Retorna la retención semanal (nuevos vs recurrentes), distribución de frecuencia de visitas, listado de clientes dormidos y análisis de cohortes mensuales. Solo para el OWNER.',
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
    return this.reportsService.getRetention(merchantId, query, user.id);
  }

  @Get([
    'merchants/:merchantId/reports/promotions',
    'brands/:merchantId/reports/promotions',
  ])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rendimiento y canjes por promoción',
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
    return this.reportsService.getPromotions(merchantId, query, user.id);
  }

  @Get([
    'merchants/:merchantId/reports/staff',
    'brands/:merchantId/reports/staff',
  ])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actividad de equipo, auditoría y alertas antifraude',
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
    return this.reportsService.getStaffActivity(merchantId, query, user.id);
  }
}
