import { describe, expect, it } from 'vitest';
import { isValidSlug, slugify } from './slug.util.js';

describe('slugify', () => {
  it.each([
    ['Café Central', 'cafe-central'],
    ['  Café Ñandú (José) ', 'cafe-nandu-jose'],
    ['PANADERÍA   La Espiga!!', 'panaderia-la-espiga'],
    ['---hola---', 'hola'],
    ['', ''],
  ])('normalizes %j to %j', (raw, expected) => {
    expect(slugify(raw)).toBe(expected);
  });

  it('cuts at 60 characters without leaving a trailing dash', () => {
    // Mismo caso que rompía la versión SQL anterior (recortaba después del trim)
    const slug = slugify('a'.repeat(59) + ' bcd');
    expect(slug).toBe('a'.repeat(59));
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('isValidSlug', () => {
  it.each([
    ['cafe-central', true],
    ['local-a61bee26', true],
    ['ab', false], // muy corto
    ['a'.repeat(61), false], // muy largo
    ['Cafe', false], // sin normalizar
    ['cafe--central', false],
    ['-cafe', false],
  ])('%j → %s', (slug, expected) => {
    expect(isValidSlug(slug)).toBe(expected);
  });
});
