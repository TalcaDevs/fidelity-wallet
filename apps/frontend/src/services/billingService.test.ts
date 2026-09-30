import { describe, expect, it } from 'vitest';
import type { SubscriptionMock } from '@fidelity/shared';
import { trialDaysLeft } from './billingService';

const subscription = (overrides: Partial<SubscriptionMock> = {}): SubscriptionMock => ({
  planId: 'TRIAL',
  status: 'TRIALING',
  billingCycle: 'MONTHLY',
  trialEndsAt: '2026-10-10T00:00:00.000Z',
  currentPeriodEnd: '2026-10-10T00:00:00.000Z',
  usage: { programs: 1, locations: 1, teamUsers: 0, customers: 0 },
  ...overrides,
});

describe('trialDaysLeft', () => {
  it('counts the started day as a full day', () => {
    expect(trialDaysLeft(subscription(), new Date('2026-09-30T12:00:00Z'))).toBe(10);
  });

  it('is 0 once the trial is over or when there is no trial', () => {
    expect(trialDaysLeft(subscription(), new Date('2026-10-11T00:00:00Z'))).toBe(0);
    expect(trialDaysLeft(subscription({ status: 'ACTIVE' }), new Date('2026-09-30'))).toBe(0);
  });
});
