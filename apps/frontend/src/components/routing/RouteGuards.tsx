import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import type { MembershipState, MerchantRole } from '../../hooks/useMembership';
import { supabase } from '../../lib/supabase';
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

function AccessDenied({ reason }: { reason: string | null }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center bg-slate-50 dark:bg-[#0f172a] text-slate-600 dark:text-slate-300">
      <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl font-black">
        !
      </div>
      <div>
        <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">No pudimos verificar tu acceso</p>
        <p className="max-w-md">{reason ?? 'Tu usuario no tiene un local asociado.'}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-3 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold transition-all"
        >
          Reintentar
        </button>
        <button
          onClick={() => supabase.auth.signOut()}
          className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Cerrar sesión
        </button>
      </div>
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

  // Fail-closed: si no pudimos confirmar la membresía (error de red, tabla
  // inaccesible, usuario sin local) no se asume ningún rol ni se redirige en
  // silencio. Se deniega y se dice por qué, con una salida clara.
  if (membership.error || !membership.role) {
    return <AccessDenied reason={membership.error} />;
  }

  if (!allow.includes(membership.role)) {
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
