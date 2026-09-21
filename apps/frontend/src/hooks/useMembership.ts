import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { fetchMemberships, type MerchantRole } from '../services/membershipService';

export type { MerchantRole };

export interface MembershipState {
  merchantId: string | null;
  role: MerchantRole | null;
  loading: boolean;
  error: string | null;
}

interface InternalState extends MembershipState {
  userId: string | null;
}

function initialState(userId: string | null): InternalState {
  return userId
    ? { userId, merchantId: null, role: null, loading: true, error: null }
    : { userId: null, merchantId: null, role: null, loading: false, error: null };
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

  useEffect(() => {
    if (!userId) return;

    let active = true;

    fetchMemberships(userId)
      .then((memberships) => {
        if (!active) return;
        const membership = memberships[0];
        // TRANSITORIO: hasta que todas las cuentas tengan fila en MerchantUser,
        // el supuesto vigente del sistema es "un usuario = un comercio propio",
        // así que sin fila asumimos OWNER del comercio con su mismo id.
        setState(
          membership
            ? { userId, merchantId: membership.merchantId, role: membership.role, loading: false, error: null }
            : { userId, merchantId: userId, role: 'OWNER', loading: false, error: null }
        );
      })
      .catch((err: unknown) => {
        if (!active) return;
        // El mismo fallback cubre el período en que la tabla todavía no existe
        // en el entorno: se registra el error, pero no se deja al dueño fuera
        // de su propio panel.
        console.error('Error fetching membership:', err);
        setState({
          userId,
          merchantId: userId,
          role: 'OWNER',
          loading: false,
          error: err instanceof Error ? err.message : 'Error fetching membership',
        });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return { merchantId: state.merchantId, role: state.role, loading: state.loading, error: state.error };
}
