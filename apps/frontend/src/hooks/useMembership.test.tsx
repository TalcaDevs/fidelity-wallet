import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import {
  ACTIVE_BRAND_STORAGE_KEY,
  resolveActiveMembership,
  useMembership,
} from './useMembership';
import { fetchMemberships, type Membership } from '../services/membershipService';

vi.mock('../services/membershipService', () => ({
  fetchMemberships: vi.fn(),
}));

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
    isSuspended: false,
  },
  {
    brandId: 'brand-beta',
    merchantId: 'merchant-beta',
    programId: 'prog-beta',
    role: 'OWNER',
    brandStatus: 'ACTIVE',
    isSuspended: false,
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
  });

  it('resuelve dinámicamente la membresía activa y persiste la selección', async () => {
    vi.mocked(fetchMemberships).mockResolvedValueOnce(mockMemberships);

    const { result } = renderHook(() => useMembership(mockSession));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.brandId).toBe('brand-alpha');
    expect(result.current.memberships).toHaveLength(2);
    expect(store[ACTIVE_BRAND_STORAGE_KEY]).toBe('brand-alpha');
  });

  it('permite cambiar la membresía activa mediante selectMembership', async () => {
    vi.mocked(fetchMemberships).mockResolvedValueOnce(mockMemberships);

    const { result } = renderHook(() => useMembership(mockSession));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.brandId).toBe('brand-alpha');

    act(() => {
      result.current.selectMembership?.('brand-beta');
    });

    expect(result.current.brandId).toBe('brand-beta');
    expect(result.current.merchantId).toBe('merchant-beta');
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
  });
});
