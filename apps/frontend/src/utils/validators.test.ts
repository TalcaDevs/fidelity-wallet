import { describe, it, expect } from 'vitest';
import {
  validateRUT,
  isPhone,
  formatRutInput,
  phoneLocalDigits,
  formatPhoneLocal,
  isValidPhoneLocal,
  toFullPhone,
} from './validators';

describe('validators', () => {
  describe('validateRUT', () => {
    it.each([
      ['12345678-5', true],
      ['12.345.678-5', true],
      ['123456785', true],
      ['19000000-1', true],
      ['1.000.005-k', true], // 7 dígitos con K
      ['1.000.005-K', true],
      ['7.654.321-6', true],
      ['999999-k', false], // 6 dígitos: el backend exige 7 u 8
      ['00000000-0', false], // Not a valid real RUT
      ['12345678-0', false], // Invalid DV
      ['123', false], // Too short
      ['12345-6', false], // Too short
      ['abcdefg-h', false], // Invalid characters
    ])('validates %s as %s', (rut, expected) => {
      expect(validateRUT(rut)).toBe(expected);
    });
  });

  describe('isPhone', () => {
    it.each([
      ['+56912345678', true],
      ['+56 9 1234 5678', true],
      ['56912345678', true],
      ['912345678', true],
      ['123', false], // Too short
      ['+123456789012345678', false], // Too long
      ['abcdefghijk', false], // Invalid characters
    ])('validates %s as %s', (phone, expected) => {
      expect(isPhone(phone)).toBe(expected);
    });
  });

  describe('formatRutInput', () => {
    it.each([
      ['', ''],
      ['1', '1'],
      ['12', '1-2'],
      ['1234', '123-4'],
      ['12345', '1.234-5'],
      ['123456785', '12.345.678-5'],
      ['12.345.678-5', '12.345.678-5'], // idempotente
      ['1000005k', '1.000.005-K'], // K al final, en mayúscula
      ['12k34', '123-4'], // K en medio: se descarta
      ['12.345.678-59', '12.345.678-5'], // máximo 9 caracteres significativos
      ['12a.3b4', '123-4'], // letras que no son K
    ])('formats %s as %s', (raw, expected) => {
      expect(formatRutInput(raw)).toBe(expected);
    });
  });

  describe('phone helpers', () => {
    it.each([
      ['912345678', '912345678'],
      ['9 1234 5678', '912345678'],
      ['+56912345678', '912345678'], // pegar el número completo quita el +56
      ['56912345678', '912345678'],
      ['9123456789', '912345678'], // máximo 9 dígitos
      ['abc9', '9'],
    ])('extracts the local digits of %s', (raw, expected) => {
      expect(phoneLocalDigits(raw)).toBe(expected);
    });

    it('formats the local digits for display', () => {
      expect(formatPhoneLocal('9')).toBe('9');
      expect(formatPhoneLocal('91234')).toBe('9 1234');
      expect(formatPhoneLocal('912345678')).toBe('9 1234 5678');
    });

    it('accepts only 9-digit mobiles starting with 9', () => {
      expect(isValidPhoneLocal('912345678')).toBe(true);
      expect(isValidPhoneLocal('812345678')).toBe(false);
      expect(isValidPhoneLocal('91234567')).toBe(false);
    });

    it('always prefixes +56', () => {
      expect(toFullPhone('912345678')).toBe('+56912345678');
    });
  });
});
