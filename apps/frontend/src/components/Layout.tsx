import { useCallback, useRef, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import type { Session } from '@supabase/supabase-js';
import { useTheme } from '../hooks/useTheme';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { MerchantRole } from '../hooks/useMembership';
import { isBillingEnabled } from '../config/features';
import { useSignOut } from '../hooks/useSignOut';
import { ROUTES } from './routing/routePaths';
import { TrialBanner } from './TrialBanner';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { PanelBrand } from './admin/PanelBrand';
import { PanelMotionContext } from './admin/PanelMotionContext';
import { PANEL_ROOT } from './admin/panelStyles';
import SunIcon from '../assets/home/sun.svg?react';
import MoonIcon from '../assets/home/moon.svg?react';
import './admin/panelAnimations.css';

const NAV_LINK_CLASSES = ({ isActive }: { isActive: boolean }) =>
  `relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border transition-colors ${isActive
    ? 'bg-panel-accent/10 text-panel-accent border-panel-accent/15'
    : 'text-panel-muted border-transparent hover:bg-panel-soft hover:text-panel-text'
  }`;

const NAV_ITEMS = [
  {
    to: ROUTES.dashboard,
    label: 'Métricas Principales',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    strokeWidth: '2.5',
  },
  {
    to: ROUTES.analytics,
    label: 'Analítica',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    strokeWidth: '2',
  },
  {
    to: ROUTES.card,
    label: 'Tarjeta',
    icon: 'M11.48 3.5a.56.56 0 011.04 0l2.13 5.11a.56.56 0 00.47.34l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 00-.18.56l1.28 5.38a.56.56 0 01-.84.61l-4.72-2.88a.56.56 0 00-.59 0l-4.72 2.88a.56.56 0 01-.84-.61l1.28-5.38a.56.56 0 00-.18-.56l-4.2-3.6a.56.56 0 01.32-.99l5.52-.44a.56.56 0 00.47-.34l2.13-5.11z',
    strokeWidth: '2',
  },
  {
    to: ROUTES.customers,
    label: 'Clientes',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    strokeWidth: '2',
  },
  {
    to: ROUTES.team,
    label: 'Equipo',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    strokeWidth: '2',
  },
  {
    to: ROUTES.locations,
    label: 'Sucursales',
    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
    strokeWidth: '2',
  },
  {
    to: ROUTES.billing,
    label: 'Facturación',
    billingOnly: true,
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    strokeWidth: '2',
  },
  {
    to: ROUTES.support,
    label: 'Soporte',
    icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z',
    strokeWidth: '2',
  },
  {
    to: ROUTES.settings,
    label: 'Configuración',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    strokeWidth: '2',
  },
] as const;

// Facturación es un mockup: sin VITE_FEATURE_BILLING=true ni el ítem ni la ruta existen (§6.5).
const VISIBLE_NAV_ITEMS = NAV_ITEMS.filter((item) => !('billingOnly' in item) || isBillingEnabled);

// El sidebar es un drawer solo bajo el breakpoint md; en escritorio está siempre visible.
const MOBILE_QUERY = '(max-width: 767px)';

const ROLE_LABELS: Record<MerchantRole, string> = {
  OWNER: 'Administrador',
  STAFF: 'Cajero',
};

export function Layout({
  session,
  role,
  brandId,
}: {
  session: Session | null;
  role: MerchantRole | null;
  brandId: string | null;
}) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { pathname } = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = Boolean(systemReducedMotion);
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const drawerRef = useRef<HTMLElement>(null);
  const drawerOpen = isMobile && isSidebarOpen;
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const isSidebarHidden = isMobile && !isSidebarOpen;
  useDialogFocus(drawerOpen, drawerRef, closeSidebar);
  const handleLogout = useSignOut();
  const currentPage = VISIBLE_NAV_ITEMS.find((item) => pathname.startsWith(item.to))?.label ?? 'Panel';

  return (
    <PanelMotionContext value={reducedMotion}>
      <div className={`${PANEL_ROOT} flex h-dvh w-full overflow-hidden relative isolate`} data-motion-reduced={reducedMotion}>
        <a href="#panel-content" className="fixed -top-20 left-4 z-[70] rounded-xl bg-panel-primary px-4 py-3 text-white focus:top-4">
          Saltar al contenido
        </a>
        {drawerOpen && (
          <button tabIndex={-1} aria-label="Cerrar menú" onClick={closeSidebar} className="fixed inset-0 z-30 bg-[#061524]/50 backdrop-blur-sm" />
        )}
        <aside
          id="panel-navigation"
          ref={drawerRef}
          tabIndex={-1}
          role={drawerOpen ? 'dialog' : undefined}
          aria-label="Navegación del panel"
          aria-modal={drawerOpen ? true : undefined}
          aria-hidden={isSidebarHidden}
          inert={isSidebarHidden}
          className={`fixed inset-y-0 left-0 z-40 flex w-[min(19rem,calc(100vw-2rem))] flex-col overflow-y-auto border-r border-panel-border bg-panel-surface p-5 transition-transform duration-250 md:relative md:w-64 md:shrink-0 md:translate-x-0 lg:w-72 lg:p-6 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="mb-8 flex items-center justify-between gap-2">
            <PanelBrand onClick={closeSidebar} />
            {isMobile && (
              <button type="button" aria-label="Cerrar navegación" onClick={closeSidebar} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-panel-muted hover:bg-panel-soft">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeWidth="2" d="m6 6 12 12M6 18 18 6" /></svg>
              </button>
            )}
          </div>
          <nav aria-label="Secciones del negocio" className="flex-1 space-y-1">
            {VISIBLE_NAV_ITEMS.map((item, index) => (
              <div key={item.to}>
                {(index === 0 || item.to === ROUTES.card || item.to === ROUTES.support) && (
                  <p className={`px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-panel-muted ${index === 0 ? '' : 'pt-5'}`}>
                    {index === 0 ? 'Vista general' : item.to === ROUTES.card ? 'Tu programa' : 'Ayuda y cuenta'}
                  </p>
                )}
                <NavLink to={item.to} className={NAV_LINK_CLASSES} onClick={closeSidebar}>
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={item.strokeWidth} d={item.icon} />
                  </svg>
                  {item.label}
                </NavLink>
              </div>
            ))}
          </nav>
          <div className="mt-6 border-t border-panel-border pt-4">
            <div className="mb-4 flex gap-2">
              <button type="button" onClick={toggleDarkMode} aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-panel-border px-3 py-2.5 text-xs font-semibold text-panel-muted transition-colors hover:bg-panel-soft">
                {isDarkMode ? <SunIcon className="h-4 w-4" aria-hidden="true" /> : <MoonIcon className="h-4 w-4" aria-hidden="true" />}
                {isDarkMode ? 'Claro' : 'Oscuro'}
              </button>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-panel-soft px-3 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-panel-accent/10 text-sm font-bold text-panel-accent" aria-hidden="true">
                {session?.user?.email?.[0]?.toUpperCase() ?? 'L'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{session?.user?.email}</p>
                <p className="mt-0.5 text-[11px] text-panel-muted">{role ? ROLE_LABELS[role] : 'Sin rol asignado'}</p>
              </div>
            </div>
            <button type="button" onClick={handleLogout} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeWidth="2" d="M9 5H5v14h4m5-12 5 5-5 5m-5-5h10" /></svg>
              Cerrar Sesión
            </button>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col" inert={drawerOpen}>
          <header className="relative z-20 flex min-h-18 shrink-0 items-center justify-between gap-3 border-b border-panel-border bg-panel-surface/80 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setIsSidebarOpen(true)} aria-label="Abrir menú" aria-controls="panel-navigation" aria-expanded={drawerOpen} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-panel-border text-panel-muted md:hidden">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-panel-muted">Panel del dueño</p>
                <p className="truncate text-sm font-semibold">{currentPage}</p>
              </div>
            </div>
            <Link to={ROUTES.scan} aria-label="Abrir Escáner" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-panel-primary px-3 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:brightness-110 sm:px-4">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeWidth="2" d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5M8 8h2v2H8zm6 0h2v2h-2zM8 14h2v2H8zm6 0h2v2h-2z" /></svg>
              <span>Escáner</span>
            </Link>
          </header>
          <main id="panel-content" tabIndex={-1} className="relative isolate flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(ellipse_at_top_right,#087bd710,transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top_right,#087bd71c,transparent_65%)]" />
            <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
              {role === 'OWNER' && isBillingEnabled && <TrialBanner brandId={brandId} />}
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </PanelMotionContext>
  );
}
