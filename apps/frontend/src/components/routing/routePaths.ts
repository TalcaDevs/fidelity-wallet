export const ROUTES = {
  home: '/',
  login: '/admin/login',
  resetPassword: '/admin/reset',
  admin: '/admin',
  dashboard: '/admin/dashboard',
  analytics: '/admin/analytics',
  team: '/admin/team',
  locations: '/admin/locations',
  billing: '/admin/billing',
  support: '/admin/support',
  promotions: '/admin/promotions',
  card: '/admin/card',
  customers: '/admin/customers',
  customerDetail: '/admin/customers/:customerId',
  settings: '/admin/settings',
  scan: '/scan',
  internal: '/internal',
  terms: '/terminos',
} as const;

export const customerDetailPath = (customerId: string) =>
  ROUTES.customerDetail.replace(':customerId', encodeURIComponent(customerId));

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

/**
 * Determina si una ruta es un destino de retorno administrativo válido después del login.
 * /scan y /login no son destinos de retorno:
 * - /scan es una ruta operativa del cajero; el destino tras login lo resuelve
 *   RedirectIfAuthenticated según el rol (STAFF -> /scan, OWNER -> /admin/dashboard).
 * - /login es el propio formulario.
 */
export function isReturnableRoute(from: string): boolean {
  return from !== ROUTES.login && from !== ROUTES.scan;
}

export function buildLoginUrl(from: string): string {
  if (!isReturnableRoute(from)) return ROUTES.login;
  return `${ROUTES.login}?redirect=${encodeURIComponent(from)}`;
}

// La URL del correo de recuperación tiene que apuntar al formulario de nueva
// contraseña, no a la landing pública.
export function passwordResetUrl(): string {
  return `${window.location.origin}${ROUTES.resetPassword}`;
}
