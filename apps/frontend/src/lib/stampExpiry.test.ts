import { describe, it, expect } from 'vitest';
import { formatStampExpiry, isValidStampValidityDays } from './stampExpiry';

// Construimos las fechas en hora local y las pasamos como ISO: así el test da
// el mismo resultado en cualquier zona horaria, sin tocar el reloj global.
const iso = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour).toISOString();

const NOW = new Date(2026, 2, 10, 15, 30); // 10/03/2026 15:30 local

describe('formatStampExpiry', () => {
  it('no devuelve texto cuando no hay vencimiento', () => {
    expect(formatStampExpiry(null, NOW)).toBeNull();
    expect(formatStampExpiry(undefined, NOW)).toBeNull();
    expect(formatStampExpiry('', NOW)).toBeNull();
  });

  it('no devuelve texto cuando la fecha es inválida', () => {
    expect(formatStampExpiry('no-es-una-fecha', NOW)).toBeNull();
  });

  it('marca como vencido lo que quedó en el pasado', () => {
    expect(formatStampExpiry(iso(2026, 3, 9), NOW)).toBe('Vencido');
    expect(formatStampExpiry(iso(2025, 12, 31), NOW)).toBe('Vencido');
  });

  it('dice "vence hoy" aunque la hora ya haya pasado', () => {
    expect(formatStampExpiry(iso(2026, 3, 10, 23), NOW)).toBe('Vence hoy');
    expect(formatStampExpiry(iso(2026, 3, 10, 8), NOW)).toBe('Vence hoy');
  });

  it('usa "mañana" en singular', () => {
    expect(formatStampExpiry(iso(2026, 3, 11, 1), NOW)).toBe('Vence mañana');
  });

  it('cuenta días hasta una semana', () => {
    expect(formatStampExpiry(iso(2026, 3, 15), NOW)).toBe('Vence en 5 días');
    expect(formatStampExpiry(iso(2026, 3, 17), NOW)).toBe('Vence en 7 días');
  });

  it('pasa a fecha concreta más allá de una semana', () => {
    expect(formatStampExpiry(iso(2026, 3, 18), NOW)).toBe('Vence el 18/03');
    expect(formatStampExpiry(iso(2026, 12, 14), NOW)).toBe('Vence el 14/12');
  });

  it('cruza el cambio de mes sin perder la cuenta', () => {
    const finDeMes = new Date(2026, 0, 30, 9, 0); // 30/01/2026
    expect(formatStampExpiry(iso(2026, 2, 1), finDeMes)).toBe('Vence en 2 días');
    expect(formatStampExpiry(iso(2026, 2, 20), finDeMes)).toBe('Vence el 20/02');
  });
});

describe('isValidStampValidityDays', () => {
  it('acepta null: significa que los sellos no vencen', () => {
    expect(isValidStampValidityDays(null)).toBe(true);
    expect(isValidStampValidityDays(undefined)).toBe(true);
  });

  it('acepta enteros positivos', () => {
    expect(isValidStampValidityDays(1)).toBe(true);
    expect(isValidStampValidityDays(365)).toBe(true);
  });

  it('rechaza cero, negativos y decimales', () => {
    expect(isValidStampValidityDays(0)).toBe(false);
    expect(isValidStampValidityDays(-30)).toBe(false);
    expect(isValidStampValidityDays(30.5)).toBe(false);
  });

  it('rechaza NaN', () => {
    expect(isValidStampValidityDays(Number.NaN)).toBe(false);
  });
});
