import { lazy, Suspense } from 'react';
import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import type { PlatformRole } from '@fidelity/shared';
import { useSignOut } from '../../hooks/useSignOut';
import { useTheme } from '../../hooks/useTheme';
import { InternalRoleContext } from './internalRole';
import { InternalAudit } from './InternalAudit';
import { InternalBrands } from './InternalBrands';
import { InternalCustomers } from './InternalCustomers';
import { InternalCustomerHistory } from './InternalCustomerHistory';
import { InternalSummary } from './InternalSummary';
import { InternalTickets } from './InternalTickets';
import { PANEL_ROOT } from '../../components/admin/panelStyles';
import WalletIcon from '../../assets/home/wallet.svg?react';
import SunIcon from '../../assets/home/sun.svg?react';
import MoonIcon from '../../assets/home/moon.svg?react';
import '../../components/admin/panelAnimations.css';

// Las pantallas con mapa traen Leaflet: se descargan al abrirlas, no con la bandeja de tickets.
const InternalMap = lazy(() => import('./InternalMap').then((m) => ({ default: m.InternalMap })));
const InternalBrandDetail = lazy(() =>
  import('./InternalBrandDetail').then((m) => ({ default: m.InternalBrandDetail })),
);

const NAV = [
  { to: 'summary', label: 'Resumen' },
  { to: 'tickets', label: 'Tickets' },
  { to: 'brands', label: 'Marcas' },
  { to: 'map', label: 'Mapa de locales' },
  { to: 'customers', label: 'Clientes' },
  { to: 'audit', label: 'Auditoría', superadminOnly: true },
] as const;

const ROLE_LABEL: Record<PlatformRole, string> = { SUPERADMIN: 'Superadmin', SUPPORT: 'Soporte' };

function InternalLayout({ session, role }: { session: Session; role: PlatformRole }) {
  const signOut = useSignOut();
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <div className={`${PANEL_ROOT} min-h-screen flex flex-col md:flex-row motion-reduce:[&_*]:animate-none! motion-reduce:[&_*]:transition-none!`}>
      <aside className="sticky top-0 z-20 md:h-screen md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-panel-border bg-panel-surface p-5 flex md:flex-col gap-4 md:gap-8 items-center md:items-stretch overflow-x-auto md:overflow-y-auto">
        <div className="flex items-center gap-3 shrink-0">
          <div aria-hidden="true" className="grid w-10 h-10 shrink-0 -rotate-6 place-items-center rounded-xl bg-panel-primary text-white"><WalletIcon className="h-5 w-5" /></div>
          <div>
            <p className="font-extrabold leading-tight">Fidelity</p>
            <p className="text-xs text-panel-accent font-bold uppercase tracking-wider">Panel interno</p>
          </div>
        </div>
        <nav className="flex md:flex-col gap-1 md:flex-1">
          {NAV.filter((item) => !('superadminOnly' in item) || role === 'SUPERADMIN').map((item) => (
            <NavLink
              key={item.to}
              to={`/internal/${item.to}`}
              className={({ isActive }) =>
                `px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${isActive ? 'bg-panel-accent/10 text-panel-accent' : 'text-panel-muted hover:bg-panel-soft'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-3 md:block md:space-y-3">
          <div className="hidden md:block p-3 rounded-xl bg-panel-soft">
            <p className="text-sm font-bold truncate">{session.user.email}</p>
            <p className="text-xs text-panel-accent font-bold">{ROLE_LABEL[role]}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={toggleDarkMode} aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-panel-border bg-panel-surface text-panel-muted transition-colors hover:bg-panel-soft">
              {isDarkMode ? <SunIcon className="h-4 w-4" aria-hidden="true" /> : <MoonIcon className="h-4 w-4" aria-hidden="true" />}
            </button>
            <button type="button" onClick={signOut} className="flex-1 px-3 py-2 rounded-xl text-red-600 dark:text-red-300 hover:bg-red-500/10 font-bold text-sm">
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-4 sm:p-8 lg:p-10">
        <Suspense fallback={<div className="h-96 rounded-2xl bg-panel-soft animate-pulse" />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

/** Rutas de /internal/*. Se carga con React.lazy: no viaja en el bundle del panel ni de /join. */
export default function InternalApp({ session, role }: { session: Session; role: PlatformRole }) {
  return (
    <InternalRoleContext.Provider value={{ userId: session.user.id, role }}>
      <Routes>
        <Route element={<InternalLayout session={session} role={role} />}>
          <Route index element={<Navigate to="summary" replace />} />
          <Route path="summary" element={<InternalSummary />} />
          <Route path="tickets" element={<InternalTickets />} />
          <Route path="brands" element={<InternalBrands />} />
          <Route path="brands/:brandId" element={<InternalBrandDetail />} />
          <Route path="map" element={<InternalMap />} />
          <Route path="customers" element={<InternalCustomers />} />
          {role === 'SUPERADMIN' && <Route path="customers/:customerId/history" element={<InternalCustomerHistory />} />}
          {role === 'SUPERADMIN' && <Route path="audit" element={<InternalAudit />} />}
          <Route path="*" element={<Navigate to="summary" replace />} />
        </Route>
      </Routes>
    </InternalRoleContext.Provider>
  );
}
