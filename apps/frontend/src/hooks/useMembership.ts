import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  fetchMemberships,
  type BrandStatus,
  type MerchantRole,
  type Membership,
} from '../services/membershipService';

export type { MerchantRole, BrandStatus, Membership };

export const ACTIVE_BRAND_STORAGE_KEY = 'fidelity_active_brand_id';

export interface MembershipState {
  brandId: string | null;
  merchantId: string | null;
  programId: string | null;
  role: MerchantRole | null;
  brandStatus?: BrandStatus | null;
  isSuspended?: boolean;
  memberships?: Membership[];
  selectMembership?: (brandId: string) => void;
  loading: boolean;
  error: string | null;
}

interface InternalState extends MembershipState {
  userId: string | null;
}

const EMPTY: Omit<InternalState, 'userId'> = {
  brandId: null,
  merchantId: null,
  programId: null,
  role: null,
  brandStatus: null,
  isSuspended: false,
  memberships: [],
  selectMembership: () => {},
  loading: false,
  error: null,
};

function getSavedBrandId(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_BRAND_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

function saveBrandId(brandId: string) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_BRAND_STORAGE_KEY, brandId);
    }
  } catch {
    // Si localStorage no está disponible (modo privado/sandbox), no interrumpir la app
  }
}

export function resolveActiveMembership(
  memberships: Membership[],
  preferredBrandId?: string | null
): Membership | undefined {
  if (memberships.length === 0) return undefined;
  const targetId = preferredBrandId ?? getSavedBrandId();
  if (targetId) {
    const found = memberships.find((m) => m.brandId === targetId);
    if (found) return found;
  }
  return memberships[0];
}

function initialState(userId: string | null): InternalState {
  return userId
    ? { userId, ...EMPTY, loading: true }
    : { userId: null, ...EMPTY };
}

export function useMembership(session: Session | null): MembershipState {
  const userId = session?.user?.id ?? null;
  const [state, setState] = useState<InternalState>(() => initialState(userId));

  // Si cambia el usuario, el estado se reinicia durante el render (mismo patrón
  // que useMediaQuery) en vez de hacerlo en un efecto, para no encadenar un
  // render extra mostrando la membresía del usuario anterior.
  if (state.userId !== userId) {
    setState(initialState(userId));
  }

  const selectMembership = useCallback((targetBrandId: string) => {
    setState((prev) => {
      const list = prev.memberships ?? [];
      const target = list.find((m) => m.brandId === targetBrandId);
      if (!target) return prev;
      saveBrandId(target.brandId);
      return {
        ...prev,
        ...target,
      };
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    let active = true;

    fetchMemberships(userId)
      .then((memberships) => {
        if (!active) return;
        if (memberships.length === 0) {
          setState({
            userId,
            ...EMPTY,
            memberships: [],
            selectMembership,
            error: 'Tu usuario no está asociado a ningún local.',
          });
          return;
        }

        const activeMembership = resolveActiveMembership(memberships);
        if (activeMembership) {
          saveBrandId(activeMembership.brandId);
        }

        // Sin fila de membresía no hay rol: fail-closed.
        setState({
          userId,
          ...(activeMembership ?? EMPTY),
          memberships,
          selectMembership,
          loading: false,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        // Un fallo de red o un error transitorio NO puede otorgar permisos: sin
        // membresía confirmada se deniega el acceso y el guard lo muestra. Darle
        // OWNER a quien no pudimos verificar es una escalada de privilegios.
        console.error('Error fetching membership:', err);
        setState({
          userId,
          ...EMPTY,
          memberships: [],
          selectMembership,
          error: err instanceof Error ? err.message : 'No pudimos verificar tu acceso.',
        });
      });

    return () => {
      active = false;
    };
  }, [userId, selectMembership]);

  const { userId: _userId, ...membership } = state;
  return membership;
}
