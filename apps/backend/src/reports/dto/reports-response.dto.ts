import { ApiProperty } from '@nestjs/swagger';

export class KpiMetricDto {
  @ApiProperty({ description: 'Valor en el período actual', example: 125 })
  current: number;

  @ApiProperty({ description: 'Valor en el período anterior equivalente', example: 100 })
  previous: number;

  @ApiProperty({
    description: 'Porcentaje de cambio respecto al período anterior (null si no se puede calcular)',
    example: 25.0,
    nullable: true,
  })
  changePercentage: number | null;
}

export class OverviewKpisDto {
  @ApiProperty({ description: 'Nuevos clientes registrados en el período', type: KpiMetricDto })
  newCustomers: KpiMetricDto;

  @ApiProperty({ description: 'Clientes con al menos una visita en el período', type: KpiMetricDto })
  activeCustomers: KpiMetricDto;

  @ApiProperty({ description: 'Total de sellos otorgados', type: KpiMetricDto })
  stampsDelivered: KpiMetricDto;

  @ApiProperty({ description: 'Total de premios canjeados', type: KpiMetricDto })
  rewardsRedeemed: KpiMetricDto;

  @ApiProperty({
    description: 'Tasa de recurrencia (% de clientes activos con >1 visita)',
    type: KpiMetricDto,
  })
  recurrenceRate: KpiMetricDto;

  @ApiProperty({ description: 'Sellos expirados en el período sin haber sido canjeados', type: KpiMetricDto })
  expiredStamps: KpiMetricDto;
}

export class TimeSeriesPointDto {
  @ApiProperty({ description: 'Fecha en formato YYYY-MM-DD según la zona horaria del comercio', example: '2026-09-28' })
  date: string;

  @ApiProperty({ description: 'Cantidad de sellos entregados en este día', example: 15 })
  stamps: number;

  @ApiProperty({ description: 'Cantidad de premios canjeados en este día', example: 2 })
  rewards: number;

  @ApiProperty({ description: 'Clientes únicos atendidos en este día', example: 14 })
  uniqueCustomers: number;
}

export class MethodDistributionDto {
  @ApiProperty({ description: 'Total de escaneos realizados vía código QR', example: 85 })
  qrCount: number;

  @ApiProperty({ description: 'Total de búsquedas manuales realizadas en caja', example: 15 })
  manualCount: number;

  @ApiProperty({ description: 'Porcentaje de escaneos por QR', example: 85.0 })
  qrPercentage: number;

  @ApiProperty({ description: 'Porcentaje de búsquedas manuales', example: 15.0 })
  manualPercentage: number;
}

export class OverviewReportDto {
  @ApiProperty({ description: 'Resumen de KPIs con comparación al período anterior', type: OverviewKpisDto })
  kpis: OverviewKpisDto;

  @ApiProperty({ description: 'Evolución diaria de actividad en el período', type: [TimeSeriesPointDto] })
  timeSeries: TimeSeriesPointDto[];

  @ApiProperty({ description: 'Desglose del método de escaneo (QR vs Manual)', type: MethodDistributionDto })
  methodDistribution: MethodDistributionDto;
}

export class WeeklyRetentionPointDto {
  @ApiProperty({ description: 'Inicio de la semana (formato YYYY-MM-DD)', example: '2026-09-01' })
  weekStart: string;

  @ApiProperty({ description: 'Clientes nuevos registrados esa semana', example: 20 })
  newCustomers: number;

  @ApiProperty({ description: 'Clientes recurrentes que volvieron esa semana', example: 35 })
  returningCustomers: number;
}

export class FrequencyDistributionItemDto {
  @ApiProperty({ description: 'Rango de visitas (ej. "1 visita", "2-3 visitas", "4+ visitas")', example: '2-3 visitas' })
  range: string;

  @ApiProperty({ description: 'Cantidad de clientes en este segmento', example: 45 })
  customerCount: number;

  @ApiProperty({ description: 'Porcentaje sobre el total de clientes activos', example: 36.0 })
  percentage: number;
}

export class DormantCustomerDto {
  @ApiProperty({ description: 'ID del cliente', example: 'd3b07384-d113-4011-8e8e-d9006fa70bc6' })
  customerId: string;

  @ApiProperty({ description: 'RUT o teléfono enmascarado del cliente', example: '12.***.*78-5' })
  maskedIdentifier: string;

  @ApiProperty({ description: 'Fecha de su última visita', example: '2026-08-15T14:30:00.000Z' })
  lastVisitAt: string;

  @ApiProperty({ description: 'Días transcurridos desde su última visita', example: 46 })
  daysInactive: number;
}

export class DormantCustomersGroupDto {
  @ApiProperty({ description: 'Total de clientes que superan el umbral de inactividad', example: 12 })
  count: number;

  @ApiProperty({ description: 'Lista de clientes dormidos más recientes', type: [DormantCustomerDto] })
  customers: DormantCustomerDto[];
}

export class CohortItemDto {
  @ApiProperty({ description: 'Mes de alta (YYYY-MM)', example: '2026-06' })
  cohortMonth: string;

  @ApiProperty({ description: 'Clientes dados de alta en este mes', example: 50 })
  totalNewCustomers: number;

  @ApiProperty({ description: 'Porcentaje de clientes que volvieron al mes 1 (sig. mes)', example: 42.5 })
  month1ReturnRate: number;

  @ApiProperty({ description: 'Porcentaje de clientes que volvieron al mes 2', example: 30.0 })
  month2ReturnRate: number;

  @ApiProperty({ description: 'Porcentaje de clientes que volvieron al mes 3', example: 22.0 })
  month3ReturnRate: number;
}

export class RetentionReportDto {
  @ApiProperty({ description: 'Evolución semanal de clientes nuevos vs recurrentes', type: [WeeklyRetentionPointDto] })
  weeklyRetention: WeeklyRetentionPointDto[];

  @ApiProperty({ description: 'Distribución de clientes por frecuencia de visitas', type: [FrequencyDistributionItemDto] })
  visitFrequencyDistribution: FrequencyDistributionItemDto[];

  @ApiProperty({ description: 'Clientes dormidos (sin visitas recientes)', type: DormantCustomersGroupDto })
  dormantCustomers: DormantCustomersGroupDto;

  @ApiProperty({ description: 'Análisis de retención por cohortes mensuales', type: [CohortItemDto] })
  cohorts: CohortItemDto[];
}

export class PromotionMetricDto {
  @ApiProperty({ description: 'ID de la promoción', example: 'd3b07384-d113-4011-8e8e-d9006fa70bc6' })
  id: string;

  @ApiProperty({ description: 'Nombre de la promoción', example: 'Café de cortesía' })
  name: string;

  @ApiProperty({ description: 'Sellos requeridos para el canje', example: 5 })
  targetStamps: number;

  @ApiProperty({ description: 'Nombre del premio entregado', example: 'Café grande' })
  rewardName: string;

  @ApiProperty({ description: 'Si la promoción se encuentra activa actualmente', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Cantidad de canjes realizados en el período', example: 28 })
  redeemedCount: number;

  @ApiProperty({
    description: 'Promedio de días desde el primer sello hasta el canje (null si no hay canjes)',
    example: 14.5,
    nullable: true,
  })
  averageDaysToRedeem: number | null;

  @ApiProperty({
    description: 'Sellos vencidos asociados a esta promoción o local sin haber sido canjeados (Breakage)',
    example: 6,
  })
  breakageCount: number;
}

export class PromotionPerformanceDto {
  @ApiProperty({ description: 'Rendimiento y canjes desglosados por promoción', type: [PromotionMetricDto] })
  promotions: PromotionMetricDto[];
}

export class StaffAlertDto {
  @ApiProperty({ description: 'Identificador del tipo de alerta', example: 'HIGH_MANUAL_RATIO' })
  type: string;

  @ApiProperty({ description: 'Severidad de la alerta', enum: ['low', 'medium', 'high'], example: 'medium' })
  severity: 'low' | 'medium' | 'high';

  @ApiProperty({
    description: 'Descripción amigable de la observación para el dueño',
    example: 'Más del 50% de los sellos fueron ingresados de forma manual (22 de 30).',
  })
  description: string;
}

export class StaffMemberMetricDto {
  @ApiProperty({ description: 'ID del miembro del equipo', example: 'd3b07384-d113-4011-8e8e-d9006fa70bc6' })
  userId: string;

  @ApiProperty({ description: 'Nombre del miembro del equipo si está registrado', example: 'Juan Pérez', nullable: true, required: false })
  staffName?: string | null;

  @ApiProperty({ description: 'Rol del usuario en el comercio (OWNER o STAFF)', example: 'STAFF' })
  role: string;

  @ApiProperty({ description: 'Sellos entregados por este miembro', example: 64 })
  stampsCount: number;

  @ApiProperty({ description: 'Premios canjeados por este miembro', example: 5 })
  redeemsCount: number;

  @ApiProperty({ description: 'Porcentaje de sellos asignados vía búsqueda manual', example: 12.5 })
  manualPercentage: number;

  @ApiProperty({ description: 'Alertas antifraude u observaciones operativas', type: [StaffAlertDto] })
  alerts: StaffAlertDto[];
}

export class StaffActivityDto {
  @ApiProperty({ description: 'Actividad y auditoría de operaciones por miembro del equipo', type: [StaffMemberMetricDto] })
  staff: StaffMemberMetricDto[];
}
