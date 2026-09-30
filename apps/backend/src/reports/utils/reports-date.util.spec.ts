import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import {
  calcChangePercentage,
  formatDateInTz,
  getMondayOfWeek,
  getMondayOfWeekStr,
  resolveDateRange,
} from './reports-date.util.js';

describe('reports-date.util', () => {
  describe('calcChangePercentage', () => {
    it('calcula porcentaje de aumento normal', () => {
      expect(calcChangePercentage(150, 100)).toBe(50);
    });

    it('calcula porcentaje de descenso normal', () => {
      expect(calcChangePercentage(80, 100)).toBe(-20);
    });

    it('retorna 0 si ambos son 0', () => {
      expect(calcChangePercentage(0, 0)).toBe(0);
    });

    it('retorna null (N/A) si el previo es 0 y el actual es mayor a 0', () => {
      expect(calcChangePercentage(10, 0)).toBeNull();
    });

    it('redondea a un decimal', () => {
      expect(calcChangePercentage(105, 30)).toBe(250);
      expect(calcChangePercentage(1, 3)).toBe(-66.7);
    });
  });

  describe('formatDateInTz', () => {
    it('formatea correctamente a YYYY-MM-DD en America/Santiago', () => {
      const d = new Date('2026-09-15T15:30:00Z');
      expect(formatDateInTz(d, 'America/Santiago')).toBe('2026-09-15');
    });

    it('respeta desfase de medianoche según zona horaria', () => {
      const d = new Date('2026-09-16T01:30:00Z');
      // En UTC es 16 de sept, en Santiago (UTC-3) son las 22:30 del 15 de sept
      expect(formatDateInTz(d, 'America/Santiago')).toBe('2026-09-15');
      expect(formatDateInTz(d, 'UTC')).toBe('2026-09-16');
    });
  });

  describe('getMondayOfWeek', () => {
    it('retorna el lunes para una fecha dada sin mutar el objeto original', () => {
      // 2026-09-16 es miércoles
      const wednesday = new Date(2026, 8, 16);
      const originalTime = wednesday.getTime();
      const monday = getMondayOfWeek(wednesday);

      expect(monday.getDay()).toBe(1); // Lunes
      expect(monday.getDate()).toBe(14); // Lunes 14 de septiembre
      expect(wednesday.getTime()).toBe(originalTime); // Inmutabilidad
    });

    it('retorna el mismo día si la fecha es lunes', () => {
      const mon = new Date(2026, 8, 14);
      const result = getMondayOfWeek(mon);
      expect(result.getDate()).toBe(14);
    });

    it('retorna el lunes previo si la fecha es domingo', () => {
      const sun = new Date(2026, 8, 20);
      const result = getMondayOfWeek(sun);
      expect(result.getDate()).toBe(14);
    });

    it('getMondayOfWeekStr formatea correctamente en la zona horaria indicada', () => {
      const sundayNightUtc = new Date('2026-09-28T01:00:00Z'); // Domingo 22:00 en Santiago
      expect(getMondayOfWeekStr(sundayNightUtc, 'America/Santiago')).toBe('2026-09-21');
      expect(getMondayOfWeekStr(sundayNightUtc, 'UTC')).toBe('2026-09-28');
    });
  });

  describe('resolveDateRange', () => {
    it('resuelve fechas válidas por defecto a 30 días', () => {
      const { from, toExclusive, prevFrom, prevToExclusive, timeZone } = resolveDateRange({});
      expect(timeZone).toBe('America/Santiago');
      expect(toExclusive.getTime()).toBeGreaterThan(from.getTime());
      expect(prevToExclusive.getTime()).toBe(from.getTime());
      expect(prevFrom.getTime()).toBeLessThan(prevToExclusive.getTime());
    });

    it('incluye un scan a las 20:00 del día final en hora local (toExclusive)', () => {
      const { from, toExclusive } = resolveDateRange({
        from: '2026-09-24',
        to: '2026-09-30',
        tz: 'America/Santiago',
      });
      const scanAt8pm = new Date('2026-09-30T20:00:00-03:00');
      expect(scanAt8pm.getTime()).toBeGreaterThanOrEqual(from.getTime());
      expect(scanAt8pm.getTime()).toBeLessThan(toExclusive.getTime());
    });

    it('rechaza zona horaria inválida', () => {
      expect(() => resolveDateRange({ tz: 'Invalid/Zone' })).toThrow(BadRequestException);
    });

    it('rechaza fecha "from" posterior a "to"', () => {
      expect(() =>
        resolveDateRange({ from: '2026-09-30', to: '2026-09-01' }),
      ).toThrow(BadRequestException);
    });

    it('rechaza rango mayor a 366 días', () => {
      expect(() =>
        resolveDateRange({ from: '2025-01-01', to: '2026-09-30' }),
      ).toThrow('El rango de fechas no puede exceder 366 días');
    });

    it('rechaza fechas malformadas', () => {
      expect(() => resolveDateRange({ from: 'fecha-invalida' })).toThrow(BadRequestException);
      expect(() => resolveDateRange({ to: 'fecha-invalida' })).toThrow(BadRequestException);
    });
  });
});
