import { describe, expect, it } from 'vitest';
import { maskPhone, maskRut } from './mask.util.js';

describe('mask.util', () => {
  describe('maskRut', () => {
    it('masks standard Chilean RUT', () => {
      expect(maskRut('12345678-5')).toBe('12.***.*78-5');
      expect(maskRut('12.345.678-5')).toBe('12.***.*78-5');
    });

    it('masks RUT ending in K', () => {
      expect(maskRut('11111111-K')).toBe('11.***.*11-K');
    });

    it('handles short RUTs gracefully', () => {
      expect(maskRut('1-9')).toBe('1-9');
      expect(maskRut('1234-5')).toBe('1***-5');
    });
  });

  describe('maskPhone', () => {
    it('masks Chilean mobile phone (+569)', () => {
      expect(maskPhone('+56912345678')).toBe('+56 9 **** 5678');
    });

    it('handles short phones gracefully', () => {
      expect(maskPhone('123')).toBe('123');
    });
  });
});
