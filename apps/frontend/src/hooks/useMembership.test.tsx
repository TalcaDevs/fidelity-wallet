import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import {
  ACTIVE_BRAND_STORAGE_KEY,
  invalidateMemberships,
  resolveActiveMembership,
  useMembership,
} from './useMembership';
import { fetchMemberships, type Membership } from '../services/membershipService';

vi.mock('../services/membershipService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/membershipService')>();
  return {
    ...actual,
    fetchMemberships: vi.fn(),
  };
});

const mockSession = {
  user: { id: 'user-123' },
} as unknown as Session;

const mockMemberships: Membership[] = [
  {
    brandId: 'brand-alpha',
    merchantId: 'merchant-alpha',
    programId: 'prog-alpha',
    role: 'OWNER',
    brandStatus: 'ACTIVE',
  },
  {
    brandId: 'brand-beta',
    merchantId: 'merchant-beta',
    programId: 'prog-beta',
    role: 'OWNER',
    brandStatus: 'ACTIVE',
  },
];

describe('resolveActiveMembership', () => {
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
  });

  it('retorna undefined para lista vacía', () => {
    expect(resolveActiveMembership([])).toBeUndefined();
  });

  it('retorna la primera membresía si no hay preferencia guardada', () => {
    expect(resolveActiveMembership(mockMemberships)).toEqual(mockMemberships[0]);
  });

  it('retorna la membresía coincidente con la preferencia guardada en localStorage', () => {
    localStorage.setItem(ACTIVE_BRAND_STORAGE_KEY, 'brand-beta');
    expect(resolveActiveMembership(mockMemberships)).toEqual(mockMemberships[1]);
  });

  it('hace fallback a la primera si la preferencia guardada ya no pertenece al usuario', () => {
    localStorage.setItem(ACTIVE_BRAND_STORAGE_KEY, 'brand-inexistente');
    expect(resolveActiveMembership(mockMemberships)).toEqual(mockMemberships[0]);
  });

  it('respeta preferredBrandId explícito sobre localStorage', () => {
    localStorage.setItem(ACTIVE_BRAND_STORAGE_KEY, 'brand-alpha');
    expect(resolveActiveMembership(mockMemberships, 'brand-beta')).toEqual(mockMemberships[1]);
  });
});

describe('useMembership hook', () => {
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

  it('retorna estado vacío y no cargando cuando no hay sesión', () => {
    const { result } = renderHook(() => useMembership(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.brandId).toBeNull();
    expect(result.current.isSuspended).toBe(false);
  });

  it('resuelve dinámicamente la membresía activa y persiste la selección', async () => {
    vi.mocked(fetchMemberships).mockResolvedValueOnce(mockMemberships);

    const { result } = renderHook(() => useMembership(mockSession));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.brandId).toBe('brand-alpha');
    expect(result.current.brandStatus).toBe('ACTIVE');
    expect(result.current.isSuspended).toBe(false);
    expect(result.current.memberships).toHaveLength(2);
    expect(store[ACTIVE_BRAND_STORAGE_KEY]).toBe('brand-alpha');
  });

  it('permite cambiar la membresía activa mediante selectMembership y deriva isSuspended de brandStatus', async () => {
    const mixedMemberships: Membership[] = [
      mockMemberships[0],
      {
        brandId: 'brand-beta',
        merchantId: '',
        programId: null,
        role: 'OWNER',
        brandStatus: 'SUSPENDED',
      },
    ];
    vi.mocked(fetchMemberships).mockResolvedValueOnce(mixedMemberships);

    const { result } = renderHook(() => useMembership(mockSession));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.brandId).toBe('brand-alpha');
    expect(result.current.isSuspended).toBe(false);

    act(() => {
      result.current.selectMembership?.('brand-beta');
    });

    expect(result.current.brandId).toBe('brand-beta');
    expect(result.current.brandStatus).toBe('SUSPENDED');
    expect(result.current.isSuspended).toBe(true);
    expect(store[ACTIVE_BRAND_STORAGE_KEY]).toBe('brand-beta');
  });

  it('inicializa con la marca previamente guardada en localStorage', async () => {
    store[ACTIVE_BRAND_STORAGE_KEY] = 'brand-beta';
    vi.mocked(fetchMemberships).mockResolvedValueOnce(mockMemberships);

    const { result } = renderHook(() => useMembership(mockSession));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.brandId).toBe('brand-beta');
  });

  it('maneja fail-closed ante error de red sin exponer privilegios', async () => {
    vi.mocked(fetchMemberships).mockRejectedValueOnce(new Error('Fallo de conexión'));

    const { result } = renderHook(() => useMembership(mockSession));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Fallo de conexión');
    expect(result.current.brandId).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.isSuspended).toBe(false);
  });

  it('actualiza el estado de ACTIVE a SUSPENDED y de vuelta a ACTIVE manteniendo el mismo userId al recuperar foco o invalidar', async () => {
    const activeMembership: Membership = {
      brandId: 'brand-alpha',
      merchantId: 'merchant-alpha',
      programId: 'prog-alpha',
      role: 'OWNER',
      brandStatus: 'ACTIVE',
    };
    const suspendedMembership: Membership = {
      brandId: 'brand-alpha',
      merchantId: '',
      programId: null,
      role: 'OWNER',
      brandStatus: 'SUSPENDED',
    };

    vi.mocked(fetchMemberships)
      .mockResolvedValueOnce([activeMembership])
      .mockResolvedValueOnce([suspendedMembership])
      .mockResolvedValueOnce([activeMembership]);

    const { result } = renderHook(() => useMembership(mockSession));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.brandStatus).toBe('ACTIVE');
    expect(result.current.isSuspended).toBe(false);
    expect(result.current.programId).toBe('prog-alpha');

    // Simular que la marca se suspende mientras la sesión sigue abierta y la ventana recupera el foco
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => {
      expect(result.current.isSuspended).toBe(true);
    });
    expect(result.current.brandStatus).toBe('SUSPENDED');
    expect(result.current.programId).toBeNull();

    // Simular reactivación de la marca en la misma sesión mediante invalidación
    act(() => {
      invalidateMemberships();
    });

    await waitFor(() => {
      expect(result.current.isSuspended).toBe(false);
    });
    expect(result.current.brandStatus).toBe('ACTIVE');
    expect(result.current.programId).toBe('prog-alpha');
    expect(result.current.merchantId).toBe('merchant-alpha');
    expect(fetchMemberships).toHaveBeenCalledTimes(3);
  });
});
