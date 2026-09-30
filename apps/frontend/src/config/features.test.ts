import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadFlag(value: string | undefined) {
  vi.resetModules();
  vi.stubEnv('VITE_FEATURE_BILLING', value as string);
  return (await import('./features')).isBillingEnabled;
}

describe('VITE_FEATURE_BILLING (HANDOFF §6.5)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('only the exact value "true" turns the billing mockup on', async () => {
    expect(await loadFlag('true')).toBe(true);
    expect(await loadFlag('')).toBe(false);
    expect(await loadFlag('false')).toBe(false);
    expect(await loadFlag('1')).toBe(false);
  });
});
