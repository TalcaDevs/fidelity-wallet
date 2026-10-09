import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import type { PlatformRole } from '@fidelity/shared';
import type { PlatformAdminState } from '../../hooks/usePlatformAdmin';
import type { MembershipState, MerchantRole } from '../../hooks/useMembership';
import { supabase } from '../../lib/supabase';
import { ROUTES, buildLoginUrl, isReturnableRoute, resolveRedirectTarget } from './routePaths';
import { WalletLoading } from '../ui/WalletLoading';
import { PublicFrame } from '../PublicFrame';

interface LocationState {
  from?: string;
}

function FullScreenLoader({ label }: { label: string }) {
  return <WalletLoading label={label} />;
}

export function AccessDenied({ reason }: { reason: string | null }) {
  return (
    <PublicFrame>
      <div className="mx-auto flex min-h-[65svh] max-w-xl flex-col items-center justify-center gap-5 px-6 py-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl font-black">
          !
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-panel-text mb-3">No pudimos verificar tu acceso</h1>
          <p className="max-w-md text-panel-muted">{reason ?? 'Tu usuario no tiene un local asociado.'}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-3 rounded-xl bg-panel-primary hover:bg-panel-primary/90 text-white font-bold transition-colors"
          >
            Reintentar
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-5 py-3 rounded-xl border border-panel-border bg-panel-surface font-bold transition-colors hover:bg-panel-soft"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </PublicFrame>
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
  platformAdmin,
}: {
  session: Session | null;
  membership: MembershipState;
  allow: readonly MerchantRole[];
  platformAdmin?: PlatformAdminState;
}) {
  const location = useLocation();

  if (!session) {
    const from = `${location.pathname}${location.search}`;
    // Unificación con isReturnableRoute: si el origen no es retornable (ej. /scan o /admin/login),
    // no se propaga ni en la URL de login ni en el history state.
    const canReturn = isReturnableRoute(from);
    return (
      <Navigate
        to={buildLoginUrl(from)}
        state={canReturn ? ({ from } satisfies LocationState) : undefined}
        replace
      />
    );
  }

  if (membership.loading || (!membership.role && platformAdmin?.loading)) {
    return <FullScreenLoader label="Cargando tu cuenta..." />;
  }

  // Fail-closed: si no pudimos confirmar la membresía (error de red, tabla
  // inaccesible, usuario sin local) no se asume ningún rol ni se redirige en
  // silencio. Se deniega y se dice por qué, con una salida clara.
  // El equipo interno no tiene marca: su lugar es /internal.
  if (!membership.role && platformAdmin?.role) {
    return <Navigate to={ROUTES.internal} replace />;
  }

  if (membership.error || !membership.role) {
    return <AccessDenied reason={membership.error} />;
  }

  // Si la marca está suspendida (por mora o decisión interna):
  if (membership.isSuspended) {
    if (membership.role === 'STAFF') {
      return (
        <AccessDenied
          reason="Tu local se encuentra temporalmente suspendido. Contacta al administrador del comercio."
        />
      );
    }

    // Para el OWNER: solo se permiten Facturación y Soporte
    const isAllowedSuspendedRoute =
      location.pathname === ROUTES.billing ||
      location.pathname.startsWith(ROUTES.support);

    if (!isAllowedSuspendedRoute) {
      return <Navigate to={ROUTES.billing} replace />;
    }
  }

  if (!allow.includes(membership.role)) {
    return <Navigate to={ROUTES.scan} replace />;
  }

  return <Outlet />;
}

/** /internal/*: solo PlatformAdmin, según /api/internal/me (el backend lo revalida en cada request). */
export function RequirePlatformAdmin({
  session,
  platformAdmin,
  children,
}: {
  session: Session | null;
  platformAdmin: PlatformAdminState;
  children: (session: Session, role: PlatformRole) => ReactNode;
}) {
  const location = useLocation();

  if (!session) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to={buildLoginUrl(from)} state={{ from } satisfies LocationState} replace />;
  }
  if (platformAdmin.loading) return <FullScreenLoader label="Verificando acceso interno..." />;
  if (!platformAdmin.role) return <Navigate to={ROUTES.admin} replace />;
  return <>{children(session, platformAdmin.role)}</>;
}

/**
 * El login sigue siendo una ruta pública, pero con sesión abierta no tiene
 * sentido mostrar el formulario: redirige según el rol del usuario (STAFF → /scan,
 * OWNER → /admin/dashboard o subruta administrativa previa, PlatformAdmin → /internal).
 */
export function RedirectIfAuthenticated({
  session,
  membership,
  platformAdmin,
}: {
  session: Session | null;
  membership: MembershipState;
  platformAdmin: PlatformAdminState;
}) {
  const location = useLocation();
  if (!session) return <Outlet />;

  if (membership.loading || (!membership.role && platformAdmin.loading)) {
    return <FullScreenLoader label="Cargando tu cuenta..." />;
  }

  if (!membership.role && platformAdmin.role) {
    return <Navigate to={ROUTES.internal} replace />;
  }

  if (membership.role === 'STAFF') {
    if (membership.isSuspended) {
      return (
        <AccessDenied
          reason="Tu local se encuentra temporalmente suspendido. Contacta al administrador del comercio."
        />
      );
    }
    return <Navigate to={ROUTES.scan} replace />;
  }

  if (membership.error || !membership.role) {
    return <AccessDenied reason={membership.error} />;
  }

  const fromState = (location.state as LocationState | null)?.from;
  const fromQuery = new URLSearchParams(location.search).get('redirect');
  const candidate = fromState ?? fromQuery;

  if (membership.isSuspended) {
    const candidatePath = candidate ? candidate.split('?')[0].split('#')[0] : '';
    const isAllowedSuspended =
      candidate && (candidatePath === ROUTES.billing || candidatePath.startsWith(ROUTES.support));
    return <Navigate to={isAllowedSuspended ? candidate : ROUTES.billing} replace />;
  }

  // Solo respetamos destinos que pertenezcan a /admin o /internal (rutas exactas o subrutas).
  // Defensa en profundidad: previene open redirects y descarta candidatos no deseados como /scan.
  const isAllowed = (p: string) => {
    const path = p.split('?')[0].split('#')[0];
    return [ROUTES.admin, ROUTES.internal].some((base) => path === base || path.startsWith(`${base}/`));
  };
  const target =
    candidate && isAllowed(candidate)
      ? resolveRedirectTarget(candidate)
      : ROUTES.dashboard;

  return <Navigate to={target} replace />;
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
