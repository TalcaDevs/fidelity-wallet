import { describe, expect, it } from 'vitest';
import { normalizeEmail } from './email.util.js';
import { maskEmail } from './mask.util.js';

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Maria.Perez@Gmail.COM ')).toBe('maria.perez@gmail.com');
  });

  it('rejects anything that is not an email', () => {
    expect(normalizeEmail('maria')).toBeNull();
    expect(normalizeEmail('maria@gmail')).toBeNull();
    expect(normalizeEmail('ma ria@gmail.com')).toBeNull();
    expect(normalizeEmail('')).toBeNull();
  });
});

describe('maskEmail', () => {
  it('keeps the first letter and the domain', () => {
    expect(maskEmail('maria.perez@gmail.com')).toBe('m***@gmail.com');
    expect(maskEmail('broken')).toBe('***');
  });
});
