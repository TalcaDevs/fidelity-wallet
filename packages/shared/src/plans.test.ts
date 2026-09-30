import { describe, expect, it } from 'vitest';
import { CATALOG_PLANS, TRIAL_DAYS, getPlan } from './plans.js';

describe('plans catalog', () => {
  it('has the four plans of HANDOFF §6.5, in order', () => {
    expect(CATALOG_PLANS.map((p) => p.id)).toEqual(['TRIAL', 'STARTER', 'PRO', 'BUSINESS']);
  });

  it('only the trial is free and has trial days', () => {
    const trial = getPlan('TRIAL');
    expect(trial.priceUsdMonthly).toBe(0);
    expect(trial.trialDays).toBe(TRIAL_DAYS);
    for (const plan of CATALOG_PLANS.filter((p) => p.id !== 'TRIAL')) {
      expect(plan.priceUsdMonthlyAnnual).toBeLessThan(plan.priceUsdMonthly);
      expect(plan.limits.customers).toBeNull();
    }
  });
});
