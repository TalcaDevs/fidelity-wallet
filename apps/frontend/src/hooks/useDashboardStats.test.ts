import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as dashboardService from '../services/dashboardService';
import { useDashboardStats } from './useDashboardStats';

describe('useDashboardStats', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default empty state and loading true', () => {
    const { result } = renderHook(() => useDashboardStats());
    expect(result.current.stats).toEqual(dashboardService.EMPTY_STATS);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('fetches and sets dashboard stats successfully', async () => {
    const mockData: dashboardService.DashboardStats = {
      activePasses: 15,
      stampsDelivered: 42,
      rewardsRedeemed: 8,
      recentScans: [],
    };
    vi.spyOn(dashboardService, 'fetchDashboardStats').mockResolvedValue(mockData);

    const { result } = renderHook(() => useDashboardStats());

    await act(async () => {
      await result.current.fetchStats('merchant-123');
    });

    expect(dashboardService.fetchDashboardStats).toHaveBeenCalledWith('merchant-123');
    expect(result.current.stats).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles error when fetchDashboardStats throws an Error', async () => {
    vi.spyOn(dashboardService, 'fetchDashboardStats').mockRejectedValue(new Error('Network failure'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useDashboardStats());

    await act(async () => {
      await result.current.fetchStats('merchant-123');
    });

    expect(result.current.stats).toEqual(dashboardService.EMPTY_STATS);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Network failure');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('handles non-Error thrown gracefully with default message', async () => {
    vi.spyOn(dashboardService, 'fetchDashboardStats').mockRejectedValue('Unknown string error');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useDashboardStats());

    await act(async () => {
      await result.current.fetchStats('merchant-123');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Error fetching dashboard data');
  });
});
