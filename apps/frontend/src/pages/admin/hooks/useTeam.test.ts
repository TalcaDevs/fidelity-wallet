import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTeam } from './useTeam';

// Mock dependencies
const mockNotifySuccess = vi.fn();
const mockNotifyError = vi.fn();
const mockAuthenticatedFetch = vi.fn();

vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    notifySuccess: mockNotifySuccess,
    notifyError: mockNotifyError,
  }),
}));

vi.mock('../../../lib/api', () => ({
  authenticatedFetch: (url: string, options: any) => mockAuthenticatedFetch(url, options),
}));

describe('useTeam hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load staff on initialization if merchantId is present', async () => {
    const mockStaff = [
      { userId: 'u1', email: 'owner@test.com' },
    ];
    
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStaff,
    });

    const { result } = renderHook(() => useTeam('test-merchant-id'));

    // Loading should initially be true since it fires a fetch right away.
    // wait for next tick
    await act(async () => {
      await result.current.loadStaff();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.staff).toEqual(mockStaff);
    expect(mockAuthenticatedFetch).toHaveBeenCalledWith('/brands/test-merchant-id/staff', undefined);
  });

  it('should notify error if loading staff fails', async () => {
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Forbidden' }),
    });

    const { result } = renderHook(() => useTeam('test-merchant-id'));

    await act(async () => {
      await result.current.loadStaff();
    });

    expect(mockNotifyError).toHaveBeenCalledWith('Error al cargar personal');
    expect(result.current.staff).toEqual([]);
  });

  it('should remove staff and update list', async () => {
    const mockStaff = [
      { userId: 'u1', email: 'owner@test.com' },
      { userId: 'u2', email: 'staff@test.com' },
    ];
    
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStaff,
    });

    const { result } = renderHook(() => useTeam('test-merchant-id'));

    await act(async () => {
      await result.current.loadStaff();
    });

    expect(result.current.staff).toHaveLength(2);

    // Now remove one
    mockAuthenticatedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await act(async () => {
      const success = await result.current.removeStaff('u2');
      expect(success).toBe(true);
    });

    expect(result.current.staff).toHaveLength(1);
    expect(result.current.staff[0].userId).toBe('u1');
    expect(mockNotifySuccess).toHaveBeenCalledWith('Personal eliminado exitosamente');
    expect(mockAuthenticatedFetch).toHaveBeenCalledWith('/brands/test-merchant-id/staff/u2', { method: 'DELETE' });
  });
});
