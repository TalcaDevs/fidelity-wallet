import { BadRequestException } from '@nestjs/common';
import type { ReportPeriodQueryDto } from '../dto/reports-query.dto.js';

export interface ResolvedDateRange {
  from: Date;
  to: Date;
  toExclusive: Date;
  prevFrom: Date;
  prevTo: Date;
  prevToExclusive: Date;
  timeZone: string;
}

/**
 * Obtiene el offset en milisegundos de una fecha en una zona horaria dada (ej: -10800000 para UTC-3).
 */
export function getTzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const tzPart = parts.find((p) => p.type === 'timeZoneName');
  if (!tzPart) return 0;
  const match = tzPart.value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const mins = match[3] ? parseInt(match[3], 10) : 0;
  return sign * (hours * 60 + mins) * 60 * 1000;
}

/**
 * Convierte una fecha calendario (YYYY-MM-DD o ISO) al inicio del día (00:00:00) en la zona horaria indicada.
 */
export function startOfDayInTz(dateStr: string, timeZone: string): Date {
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) throw new BadRequestException('Fecha inválida');
    return d;
  }
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new BadRequestException(`Fecha inválida: ${dateStr}`);
  const [_, yStr, mStr, dStr] = match;
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const approxUtc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const offset = getTzOffsetMs(new Date(approxUtc), timeZone);
  const midnightUtc = Date.UTC(y, m - 1, d, 0, 0, 0);
  return new Date(midnightUtc - offset);
}

/**
 * Convierte una fecha calendario (YYYY-MM-DD o ISO) al inicio del día siguiente (00:00:00) en la zona horaria indicada
 * para ser utilizado como límite exclusivo (< toExclusive).
 */
export function startOfNextDayInTz(dateStr: string, timeZone: string): Date {
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) throw new BadRequestException('Fecha inválida');
    return d;
  }
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new BadRequestException(`Fecha inválida: ${dateStr}`);
  const [_, yStr, mStr, dStr] = match;
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const approxUtc = Date.UTC(y, m - 1, d + 1, 12, 0, 0);
  const offset = getTzOffsetMs(new Date(approxUtc), timeZone);
  const nextDayMidnightUtc = Date.UTC(y, m - 1, d + 1, 0, 0, 0);
  return new Date(nextDayMidnightUtc - offset);
}

/**
 * Resuelve y valida el rango de fechas y la zona horaria del reporte.
 * - 'from' se interpreta como el inicio del día en 'tz'.
 * - 'to' se interpreta como el fin del día en 'tz' con límite exclusivo ('toExclusive' = inicio del día siguiente).
 * - Período anterior ('prevFrom' .. 'prevToExclusive') no se solapa con el actual.
 */
export function resolveDateRange(query: ReportPeriodQueryDto): ResolvedDateRange {
  const timeZone = query.tz || 'America/Santiago';

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch {
    throw new BadRequestException(`Zona horaria inválida: ${timeZone}`);
  }

  let toExclusive: Date;
  let from: Date;

  if (query.to) {
    toExclusive = startOfNextDayInTz(query.to, timeZone);
  } else {
    const todayStr = formatDateInTz(new Date(), timeZone);
    toExclusive = startOfNextDayInTz(todayStr, timeZone);
  }

  if (query.from) {
    from = startOfDayInTz(query.from, timeZone);
  } else {
    from = new Date(toExclusive.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  if (from.getTime() >= toExclusive.getTime()) {
    throw new BadRequestException('La fecha de inicio ("from") no puede ser posterior a la fecha de fin ("to")');
  }

  const durationMs = toExclusive.getTime() - from.getTime();
  const maxDaysMs = 366 * 24 * 60 * 60 * 1000;
  if (durationMs > maxDaysMs) {
    throw new BadRequestException('El rango de fechas no puede exceder 366 días');
  }

  const prevToExclusive = from;
  const prevFrom = new Date(from.getTime() - durationMs);

  return {
    from,
    to: toExclusive,
    toExclusive,
    prevFrom,
    prevTo: prevToExclusive,
    prevToExclusive,
    timeZone,
  };
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
 * Si el valor previo es 0 y el actual es 0, retorna 0.
 * Si el valor previo es 0 y el actual es mayor a 0, retorna null (mostrado como N/A en frontend).
 */
export function calcChangePercentage(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null;
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
  return new Date(d.getFullYear(), d.getMonth(), diffToMonday);
}

/**
 * Retorna el string YYYY-MM-DD del lunes de la semana correspondiente en 'timeZone'.
 */
export function getMondayOfWeekStr(date: Date, timeZone = 'America/Santiago'): string {
  const dateStr = formatDateInTz(date, timeZone);
  const [y, m, d] = dateStr.split('-').map(Number);
  const calDate = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = calDate.getUTCDay();
  const diffToMonday = d - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const mondayUtc = new Date(Date.UTC(y, m - 1, diffToMonday));
  return mondayUtc.toISOString().slice(0, 10);
}
