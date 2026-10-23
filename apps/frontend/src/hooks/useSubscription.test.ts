import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SubscriptionMock } from '@fidelity/shared';
import * as billingService from '../services/billingService';
import { useSubscription } from './useSubscription';

describe('useSubscription', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not fetch and returns null values when brandId is null', () => {
    const spy = vi.spyOn(billingService, 'getSubscription');
    const { result } = renderHook(() => useSubscription(null));

    expect(spy).not.toHaveBeenCalled();
    expect(result.current.subscription).toBeNull();
    expect(result.current.trialDaysLeft).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches subscription and calculates trial days left when brandId is provided', async () => {
    const mockSubscription: SubscriptionMock = {
      planId: 'TRIAL',
      status: 'TRIALING',
      billingCycle: 'MONTHLY',
      trialEndsAt: '2026-10-20T00:00:00.000Z',
      currentPeriodEnd: '2026-10-20T00:00:00.000Z',
      usage: { programs: 1, locations: 1, teamUsers: 1, customers: 10 },
    };

    const getSubSpy = vi.spyOn(billingService, 'getSubscription').mockResolvedValue(mockSubscription);
    const daysSpy = vi.spyOn(billingService, 'trialDaysLeft').mockReturnValue(7);

    const { result } = renderHook(() => useSubscription('brand-123'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(getSubSpy).toHaveBeenCalledWith('brand-123');
    expect(daysSpy).toHaveBeenCalledWith(mockSubscription, expect.any(Date));
    expect(result.current.subscription).toEqual(mockSubscription);
    expect(result.current.trialDaysLeft).toBe(7);
    expect(result.current.error).toBeNull();
  });

  it('handles error when getSubscription rejects', async () => {
    vi.spyOn(billingService, 'getSubscription').mockRejectedValue(new Error('Failed to load subscription'));

    const { result } = renderHook(() => useSubscription('brand-123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscription).toBeNull();
    expect(result.current.trialDaysLeft).toBe(0);
    expect(result.current.error).toBe('Failed to load subscription');
  });
});
