import { describe, it, expect } from 'vitest';
import { formatLocalDate, getClientTimeZone, computeDateRange } from './dateUtils';

describe('dateUtils', () => {
  describe('formatLocalDate', () => {
    it('formats a date to YYYY-MM-DD using local calendar values', () => {
      const date = new Date(2026, 8, 30); // 30 de Septiembre de 2026
      expect(formatLocalDate(date)).toBe('2026-09-30');
    });

    it('pads single digit month and day with zeros', () => {
      const date = new Date(2026, 0, 5); // 5 de Enero de 2026
      expect(formatLocalDate(date)).toBe('2026-01-05');
    });
  });

  describe('getClientTimeZone', () => {
    it('returns a non-empty timezone string', () => {
      const tz = getClientTimeZone();
      expect(typeof tz).toBe('string');
      expect(tz.length).toBeGreaterThan(0);
    });
  });

  describe('computeDateRange', () => {
    it('computes 7d range', () => {
      const range = computeDateRange('7d');
      expect(range.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.from <= range.to).toBe(true);
    });

    it('computes 30d range', () => {
      const range = computeDateRange('30d');
      expect(range.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.from <= range.to).toBe(true);
    });

    it('computes this_month range starting from day 01', () => {
      const range = computeDateRange('this_month');
      expect(range.from).toMatch(/^\d{4}-\d{2}-01$/);
      expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
