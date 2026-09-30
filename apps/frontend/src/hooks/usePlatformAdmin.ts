import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { PlatformRole } from '@fidelity/shared';
import { getMyPlatformRole } from '../services/internalService';

export interface PlatformAdminState {
  role: PlatformRole | null;
  loading: boolean;
}

/**
 * ¿La sesión es del equipo interno? Lo decide el backend (/api/me/access contra la tabla
 * PlatformAdmin), nunca la metadata del usuario. Cualquier error cuenta como "no es admin".
 */
export function usePlatformAdmin(session: Session | null): PlatformAdminState {
  const userId = session?.user?.id ?? null;
  const [state, setState] = useState<{ userId: string | null } & PlatformAdminState>({
    userId,
    role: null,
    loading: userId !== null,
  });

  if (state.userId !== userId) {
    setState({ userId, role: null, loading: userId !== null });
  }

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getMyPlatformRole()
      .then(({ platformRole }) => active && setState({ userId, role: platformRole, loading: false }))
      .catch(() => active && setState({ userId, role: null, loading: false }));
    return () => {
      active = false;
    };
  }, [userId]);

  return { role: state.role, loading: state.loading };
}
