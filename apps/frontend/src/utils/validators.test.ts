import { describe, it, expect } from 'vitest';
import { validateRUT, isPhone } from './validators';

describe('validators', () => {
  describe('validateRUT', () => {
    it.each([
      ['12345678-5', true],
      ['12.345.678-5', true],
      ['123456785', true],
      ['19000000-1', true],
      ['999999-k', true],
      ['999999-K', true],
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
});
