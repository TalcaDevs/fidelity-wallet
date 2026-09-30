import { describe, expect, it } from 'vitest';
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  TICKET_TRANSITIONS,
  canTransition,
} from './support.js';

describe('support contract', () => {
  it('has a label for every category and status', () => {
    expect(Object.keys(TICKET_CATEGORY_LABELS).sort()).toEqual([...TICKET_CATEGORIES].sort());
    expect(Object.keys(TICKET_STATUS_LABELS).sort()).toEqual([...TICKET_STATUSES].sort());
  });

  it('never leaves CLOSED and never jumps straight from IN_PROGRESS to CLOSED', () => {
    expect(TICKET_TRANSITIONS.CLOSED).toEqual([]);
    expect(canTransition('IN_PROGRESS', 'CLOSED')).toBe(false);
    expect(canTransition('RESOLVED', 'CLOSED')).toBe(true);
  });

  it('only transitions to known statuses and never to itself', () => {
    for (const [from, targets] of Object.entries(TICKET_TRANSITIONS)) {
      for (const to of targets) {
        expect(TICKET_STATUSES).toContain(to);
        expect(to).not.toBe(from);
      }
    }
  });
});
