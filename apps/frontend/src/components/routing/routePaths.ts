export const ROUTES = {
  home: '/',
  login: '/admin/login',
  resetPassword: '/admin/reset',
  admin: '/admin',
  dashboard: '/admin/dashboard',
  promotions: '/admin/promotions',
  customers: '/admin/customers',
  settings: '/admin/settings',
  scan: '/scan',
} as const;

// El destino al que volver después del login llega desde fuera (query string o
// state del historial), así que se valida antes de usarlo: sin este filtro un
// enlace tipo /admin/login?redirect=//evil.com convierte nuestro propio login
// en un redirector hacia otro dominio.
export function resolveRedirectTarget(
  candidate: string | null | undefined,
  fallback: string = ROUTES.dashboard
): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//')) return fallback;
  if (candidate.startsWith('/\\')) return fallback;
  return candidate;
}

export function buildLoginUrl(from: string): string {
  if (from === ROUTES.login) return ROUTES.login;
  return `${ROUTES.login}?redirect=${encodeURIComponent(from)}`;
}

// La URL del correo de recuperación tiene que apuntar al formulario de nueva
// contraseña, no a la landing pública.
export function passwordResetUrl(): string {
  return `${window.location.origin}${ROUTES.resetPassword}`;
}
