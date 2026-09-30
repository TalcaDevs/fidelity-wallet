import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import type { PlatformRole } from '@fidelity/shared';
import { useSignOut } from '../../hooks/useSignOut';
import { useTheme } from '../../hooks/useTheme';
import { InternalRoleContext } from './internalRole';
import { InternalAudit } from './InternalAudit';
import { InternalBrandDetail } from './InternalBrandDetail';
import { InternalBrands } from './InternalBrands';
import { InternalCustomers } from './InternalCustomers';
import { InternalMap } from './InternalMap';
import { InternalTickets } from './InternalTickets';

const NAV = [
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
      <aside className="sticky top-0 z-20 md:h-screen md:w-64 shrink-0 bg-slate-900 text-slate-100 p-5 flex md:flex-col gap-4 md:gap-8 items-center md:items-stretch overflow-x-auto md:overflow-y-auto">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center font-black">F</div>
          <div>
            <p className="font-extrabold leading-tight">Fidelity</p>
            <p className="text-xs text-violet-300 font-bold uppercase tracking-wider">Panel interno</p>
          </div>
        </div>
        <nav className="flex md:flex-col gap-1 md:flex-1">
          {NAV.filter((item) => !('superadminOnly' in item) || role === 'SUPERADMIN').map((item) => (
            <NavLink
              key={item.to}
              to={`/internal/${item.to}`}
              className={({ isActive }) =>
                `px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${isActive ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block space-y-3">
          <div className="p-3 rounded-xl bg-slate-800">
            <p className="text-sm font-bold truncate">{session.user.email}</p>
            <p className="text-xs text-violet-300 font-bold">{ROLE_LABEL[role]}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={toggleDarkMode} aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700">
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button type="button" onClick={signOut} className="flex-1 px-3 py-2 rounded-xl text-red-300 hover:bg-red-500/10 font-bold text-sm">
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-4 sm:p-8 lg:p-10">
        <Outlet />
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
          <Route index element={<Navigate to="tickets" replace />} />
          <Route path="tickets" element={<InternalTickets />} />
          <Route path="brands" element={<InternalBrands />} />
          <Route path="brands/:brandId" element={<InternalBrandDetail />} />
          <Route path="map" element={<InternalMap />} />
          <Route path="customers" element={<InternalCustomers />} />
          {role === 'SUPERADMIN' && <Route path="audit" element={<InternalAudit />} />}
          <Route path="*" element={<Navigate to="tickets" replace />} />
        </Route>
      </Routes>
    </InternalRoleContext.Provider>
  );
}
