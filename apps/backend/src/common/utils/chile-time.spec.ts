import { describe, expect, it } from 'vitest';
import { chileDay, nextChileMidnight } from './chile-time.js';

describe('chile time', () => {
  it('uses the Chilean calendar day', () => {
    // 02:00 UTC del 4 de octubre = 23:00 del 3 en Chile (UTC-3 en horario de verano).
    expect(chileDay(new Date('2026-10-04T02:00:00Z'))).toBe('2026-10-03');
  });

  it('returns the next Chilean midnight', () => {
    expect(nextChileMidnight(new Date('2026-10-03T15:00:00Z')).toISOString()).toBe('2026-10-04T03:00:00.000Z');
    expect(nextChileMidnight(new Date('2026-07-10T15:00:00Z')).toISOString()).toBe('2026-07-11T04:00:00.000Z');
  });
});
