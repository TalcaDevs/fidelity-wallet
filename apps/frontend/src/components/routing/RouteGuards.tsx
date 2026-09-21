import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import type { MembershipState, MerchantRole } from '../../hooks/useMembership';
import { ROUTES, buildLoginUrl, resolveRedirectTarget } from './routePaths';

interface LocationState {
  from?: string;
}

function FullScreenLoader({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-[#0f172a] text-slate-500 dark:text-slate-400">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue to-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-brand-blue/30 animate-pulse">
        W
      </div>
      <p className="font-medium">{label}</p>
    </div>
  );
}

/**
 * Guard de las rutas privadas: exige sesión y, además, uno de los roles
 * permitidos. Mientras la membresía carga muestra un estado de carga en vez de
 * redirigir: si redirigiéramos con `role` todavía nulo, un OWNER vería
 * parpadear el login o la pantalla del cajero en cada recarga.
 */
export function RequireRole({
  session,
  membership,
  allow,
}: {
  session: Session | null;
  membership: MembershipState;
  allow: readonly MerchantRole[];
}) {
  const location = useLocation();

  if (!session) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to={buildLoginUrl(from)} state={{ from } satisfies LocationState} replace />;
  }

  if (membership.loading) {
    return <FullScreenLoader label="Cargando tu cuenta..." />;
  }

  if (!membership.role || !allow.includes(membership.role)) {
    return <Navigate to={ROUTES.scan} replace />;
  }

  return <Outlet />;
}

/**
 * El login sigue siendo una ruta pública, pero con sesión abierta no tiene
 * sentido mostrar el formulario: devuelve al destino que originó el redirect.
 */
export function RedirectIfAuthenticated({ session }: { session: Session | null }) {
  const location = useLocation();

  if (!session) return <Outlet />;

  const fromState = (location.state as LocationState | null)?.from;
  const fromQuery = new URLSearchParams(location.search).get('redirect');
  return <Navigate to={resolveRedirectTarget(fromState ?? fromQuery)} replace />;
}

/**
 * El enlace del correo aterriza directo en /admin/reset, pero el evento
 * PASSWORD_RECOVERY de Supabase llega de forma asíncrona y puede encontrarnos
 * en cualquier ruta. Este gate vive dentro del router (antes cortaba el árbol
 * entero en App) para que la recuperación sea una ruta más y no un modo global.
 */
export function RecoveryGate({ isRecovering }: { isRecovering: boolean }) {
  const location = useLocation();

  if (!isRecovering || location.pathname === ROUTES.resetPassword) return null;

  return <Navigate to={ROUTES.resetPassword} replace />;
}
