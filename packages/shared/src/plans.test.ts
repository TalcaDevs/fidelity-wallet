import { describe, expect, it } from 'vitest';
import { CATALOG_PLANS, TRIAL_DAYS, getPlan } from './plans.js';

describe('plans catalog', () => {
  it('has the four plans of HANDOFF §6.5, in order', () => {
    expect(CATALOG_PLANS.map((p) => p.id)).toEqual(['TRIAL', 'STARTER', 'PRO', 'BUSINESS']);
  });

  it('only the trial is free and has trial days', () => {
    const trial = getPlan('TRIAL');
    expect(trial.priceClpMonthly).toBe(0);
    expect(trial.trialDays).toBe(TRIAL_DAYS);
    for (const plan of CATALOG_PLANS.filter((p) => p.id !== 'TRIAL')) {
      expect(plan.priceClpMonthlyAnnual!).toBeLessThan(plan.priceClpMonthly);
    }
  });

  it('unlimited customers only for Pro and Business', () => {
    expect(getPlan('STARTER').limits.customers).toBe(200);
    expect(getPlan('PRO').limits.customers).toBeNull();
    expect(getPlan('BUSINESS').limits.customers).toBeNull();
  });

  it('provides increasing reward allowances across paid plans', () => {
    expect(CATALOG_PLANS.map((plan) => plan.limits.rewards)).toEqual([3, 3, 5, 10]);
  });
});
