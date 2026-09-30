import { BadRequestException } from '@nestjs/common';
import type { ReportPeriodQueryDto } from '../dto/reports-query.dto.js';

export interface ResolvedDateRange {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  timeZone: string;
}

/**
 * Resuelve y valida el rango de fechas y la zona horaria del reporte.
 * Por defecto toma los últimos 30 días en America/Santiago.
 */
export function resolveDateRange(query: ReportPeriodQueryDto): ResolvedDateRange {
  const timeZone = query.tz || 'America/Santiago';

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch {
    throw new BadRequestException(`Zona horaria inválida: ${timeZone}`);
  }

  let to: Date;
  let from: Date;

  if (query.to) {
    to = new Date(query.to);
    if (isNaN(to.getTime())) throw new BadRequestException('Fecha "to" inválida');
  } else {
    to = new Date();
  }

  if (query.from) {
    from = new Date(query.from);
    if (isNaN(from.getTime())) throw new BadRequestException('Fecha "from" inválida');
  } else {
    from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  if (from > to) {
    throw new BadRequestException('La fecha de inicio ("from") no puede ser posterior a la fecha de fin ("to")');
  }

  const durationMs = to.getTime() - from.getTime();
  const maxDaysMs = 366 * 24 * 60 * 60 * 1000;
  if (durationMs > maxDaysMs) {
    throw new BadRequestException('El rango de fechas no puede exceder 366 días');
  }

  const prevTo = new Date(from.getTime());
  const prevFrom = new Date(from.getTime() - durationMs);

  return { from, to, prevFrom, prevTo, timeZone };
}

/**
 * Formatea una fecha a formato YYYY-MM-DD según la zona horaria indicada.
 */
export function formatDateInTz(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Calcula la variación porcentual entre dos valores numéricos.
 */
export function calcChangePercentage(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  const change = ((current - previous) / previous) * 100;
  return Math.round(change * 10) / 10;
}

/**
 * Retorna una nueva instancia Date con el lunes de la semana correspondiente,
 * sin mutar la fecha de entrada (inmutabilidad).
 */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date.getTime());
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getTime());
  monday.setDate(diffToMonday);
  return monday;
}
