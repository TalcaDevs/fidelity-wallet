import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../components/routing/routePaths';
import { supabase } from '../lib/supabase';

/**
 * Cierre de sesión explícito. Sin esto, RequireRole manda al login con ?redirect=<ruta actual>
 * (pensado para una sesión que expira) y el dueño que salía desde /scan volvía al escáner al
 * entrar de nuevo. Tras salir a propósito, el login no lleva destino: OWNER → dashboard y STAFF
 * → /scan (lo decide RequireRole).
 */
export function useSignOut() {
  const navigate = useNavigate();
  return useCallback(async () => {
    await supabase.auth.signOut();
    navigate(ROUTES.login, { replace: true });
  }, [navigate]);
}
