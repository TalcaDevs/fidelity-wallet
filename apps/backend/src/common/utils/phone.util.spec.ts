import { describe, expect, it } from 'vitest';
import { normalizePhone } from './phone.util.js';

describe('phone.util', () => {
  describe('normalizePhone', () => {
    it('normalizes 9-digit Chilean phone to +569XXXXXXXX', () => {
      expect(normalizePhone('912345678')).toBe('+56912345678');
    });

    it('normalizes +569 Chilean phone with spaces and punctuation', () => {
      expect(normalizePhone('+56 9 1234 5678')).toBe('+56912345678');
      expect(normalizePhone('56912345678')).toBe('+56912345678');
    });

    it('returns null for invalid phone formats', () => {
      expect(normalizePhone('abc')).toBeNull();
      expect(normalizePhone('1234')).toBeNull();
      expect(normalizePhone('812345678')).toBeNull(); // Does not start with 9
      expect(normalizePhone('')).toBeNull();
    });
  });
});
