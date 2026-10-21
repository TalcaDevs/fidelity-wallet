import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useScannerLocation } from '../useScannerLocation';
import { listBrandLocations } from '../../../services/locationsService';

vi.mock('../../../services/locationsService', () => ({
  listBrandLocations: vi.fn(),
}));

describe('useScannerLocation', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = String(val);
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    });
    vi.clearAllMocks();
  });

  it('uses initialMerchantId for STAFF role and loads active locations for brand', async () => {
    vi.mocked(listBrandLocations).mockResolvedValueOnce([
      { id: 'loc-1', name: 'Sucursal Centro', isActive: true },
      { id: 'loc-2', name: 'Sucursal Norte', isActive: false },
    ]);

    const { result } = renderHook(() =>
      useScannerLocation({
        brandId: 'brand-1',
        initialMerchantId: 'loc-1',
        role: 'STAFF',
      })
    );

    await waitFor(() => {
      expect(result.current.locations).toHaveLength(1);
    });

    expect(result.current.merchantId).toBe('loc-1');
    expect(result.current.activeLocation?.name).toBe('Sucursal Centro');
  });

  it('falls back to first active location for OWNER when initialMerchantId is not among active locations', async () => {
    vi.mocked(listBrandLocations).mockResolvedValueOnce([
      { id: 'loc-1', name: 'Sucursal 1', isActive: true },
      { id: 'loc-2', name: 'Sucursal 2', isActive: true },
    ]);

    const { result } = renderHook(() =>
      useScannerLocation({
        brandId: 'brand-1',
        initialMerchantId: 'loc-inexistente',
        role: 'OWNER',
      })
    );

    await waitFor(() => {
      expect(result.current.merchantId).toBe('loc-1');
    });

    expect(store['fidelity_scanner_merchant_brand-1']).toBe('loc-1');

    act(() => {
      result.current.selectLocation('loc-2');
    });

    expect(result.current.merchantId).toBe('loc-2');
    expect(store['fidelity_scanner_merchant_brand-1']).toBe('loc-2');
  });

  it('syncs selected location from localStorage when brandId changes', async () => {
    store['fidelity_scanner_merchant_brand-1'] = 'loc-1';
    store['fidelity_scanner_merchant_brand-2'] = 'loc-9';

    vi.mocked(listBrandLocations)
      .mockResolvedValueOnce([
        { id: 'loc-1', name: 'Sucursal 1', isActive: true },
      ])
      .mockResolvedValueOnce([
        { id: 'loc-9', name: 'Sucursal 9', isActive: true },
      ]);

    const { result, rerender } = renderHook(
      ({ brandId }) =>
        useScannerLocation({
          brandId,
          initialMerchantId: 'loc-default',
          role: 'OWNER',
        }),
      { initialProps: { brandId: 'brand-1' } }
    );

    await waitFor(() => {
      expect(result.current.merchantId).toBe('loc-1');
    });

    rerender({ brandId: 'brand-2' });

    await waitFor(() => {
      expect(result.current.merchantId).toBe('loc-9');
    });
  });

  it('logs error and keeps empty locations when listBrandLocations fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(listBrandLocations).mockRejectedValueOnce(new Error('Network fail'));

    const { result } = renderHook(() =>
      useScannerLocation({
        brandId: 'brand-1',
        initialMerchantId: 'loc-1',
        role: 'OWNER',
      })
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    expect(result.current.locations).toEqual([]);
    consoleSpy.mockRestore();
  });
});
