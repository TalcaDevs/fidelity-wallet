import { describe, it, expect } from 'vitest';
import { cleanRut, validateRut, formatRut } from './rut.util.js';

describe('RUT Util', () => {
  describe('cleanRut', () => {
    it('should clean and uppercase RUT', () => {
      expect(cleanRut('12.345.678-k')).toBe('12345678-K');
      expect(cleanRut('11111111-1')).toBe('11111111-1');
      expect(cleanRut(' 19.876.543 - 2 ')).toBe('19876543-2');
    });

    it('should return empty string on invalid inputs', () => {
      expect(cleanRut('')).toBe('');
      expect(cleanRut('a')).toBe('');
    });
  });

  describe('validateRut', () => {
    it('should validate correctly valid RUTs', () => {
      expect(validateRut('11.111.111-1')).toBe(true);
      expect(validateRut('12345678-5')).toBe(true);
      expect(validateRut('111111111')).toBe(true);
    });

    it('should reject invalid RUTs', () => {
      expect(validateRut('11.111.111-2')).toBe(false);
      expect(validateRut('12345678-K')).toBe(false);
      expect(validateRut('123')).toBe(false);
      expect(validateRut('')).toBe(false);
    });
  });

  describe('formatRut', () => {
    it('should format clean RUT with dots and dash', () => {
      expect(formatRut('123456785')).toBe('12.345.678-5');
      expect(formatRut('11111111-1')).toBe('11.111.111-1');
    });
  });
});
