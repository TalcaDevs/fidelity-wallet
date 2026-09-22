import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { isValidChileanPhone, normalizePhone } from './phone.util.js';

describe('phone.util', () => {
  describe('isValidChileanPhone', () => {
    it('returns true for 9-digit mobile phones starting with 9', () => {
      expect(isValidChileanPhone('912345678')).toBe(true);
      expect(isValidChileanPhone('9 1234 5678')).toBe(true);
    });

    it('returns true for 11-digit mobile phones starting with 569', () => {
      expect(isValidChileanPhone('+56912345678')).toBe(true);
      expect(isValidChileanPhone('56912345678')).toBe(true);
    });

    it('returns false for invalid phone formats', () => {
      expect(isValidChileanPhone('1234')).toBe(false);
      expect(isValidChileanPhone('abc')).toBe(false);
      expect(isValidChileanPhone('812345678')).toBe(false); // Does not start with 9
    });
  });

  describe('normalizePhone', () => {
    it('normalizes 9-digit Chilean phone to +569XXXXXXXX', () => {
      expect(normalizePhone('912345678')).toBe('+56912345678');
    });

    it('normalizes +569 Chilean phone', () => {
      expect(normalizePhone('+56 9 1234 5678')).toBe('+56912345678');
    });

    it('throws BadRequestException for invalid phone format', () => {
      expect(() => normalizePhone('abc')).toThrow(BadRequestException);
      expect(() => normalizePhone('1234')).toThrow(BadRequestException);
    });
  });
});
