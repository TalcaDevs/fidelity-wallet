import { describe, expect, it } from 'vitest';
import { firstName, isValidBirthday } from './customers.js';

const today = new Date(2026, 9, 3);

describe('isValidBirthday', () => {
  it('accepts day and month without a year, including 29 February', () => {
    expect(isValidBirthday({ day: 29, month: 2 }, today)).toBe(true);
    expect(isValidBirthday({ day: 31, month: 12, year: null }, today)).toBe(true);
  });

  it('rejects impossible days and months', () => {
    expect(isValidBirthday({ day: 31, month: 4 }, today)).toBe(false);
    expect(isValidBirthday({ day: 30, month: 2 }, today)).toBe(false);
    expect(isValidBirthday({ day: 1, month: 13 }, today)).toBe(false);
    expect(isValidBirthday({ day: 0, month: 1 }, today)).toBe(false);
  });

  it('checks 29 February against the year when there is one', () => {
    expect(isValidBirthday({ day: 29, month: 2, year: 2000 }, today)).toBe(true);
    expect(isValidBirthday({ day: 29, month: 2, year: 2001 }, today)).toBe(false);
  });

  it('rejects future dates and years before 1900', () => {
    expect(isValidBirthday({ day: 4, month: 10, year: 2026 }, today)).toBe(false);
    expect(isValidBirthday({ day: 1, month: 1, year: 1899 }, today)).toBe(false);
  });
});

describe('firstName', () => {
  it('keeps only the first word', () => {
    expect(firstName('  María José  Pérez ')).toBe('María');
    expect(firstName('')).toBeNull();
    expect(firstName(null)).toBeNull();
  });
});
