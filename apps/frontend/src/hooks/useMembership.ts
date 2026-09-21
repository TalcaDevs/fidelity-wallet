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
        // Sin fila de membresía no hay rol: fail-closed. El trigger de alta crea
        // la fila del dueño y la migración backfilleó las existentes, así que
        // "sin membresía" significa que algo está mal, no que sea el dueño.
        setState(
          membership
            ? { userId, merchantId: membership.merchantId, role: membership.role, loading: false, error: null }
            : { userId, merchantId: null, role: null, loading: false, error: 'Tu usuario no está asociado a ningún local.' }
        );
      })
      .catch((err: unknown) => {
        if (!active) return;
        // Un fallo de red o un error transitorio NO puede otorgar permisos: sin
        // membresía confirmada se deniega el acceso y el guard lo muestra. Darle
        // OWNER a quien no pudimos verificar es una escalada de privilegios.
        console.error('Error fetching membership:', err);
        setState({
          userId,
          merchantId: null,
          role: null,
          loading: false,
          error: err instanceof Error ? err.message : 'No pudimos verificar tu acceso.',
        });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return { merchantId: state.merchantId, role: state.role, loading: state.loading, error: state.error };
}
