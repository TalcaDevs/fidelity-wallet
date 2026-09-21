import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { useTheme } from '../hooks/useTheme';
import { useMediaQuery } from '../hooks/useMediaQuery';
import type { MerchantRole } from '../hooks/useMembership';

const NAV_LINK_CLASSES = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300 ${
    isActive
      ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30 translate-x-1'
      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
  }`;

const NAV_ITEMS = [
  {
    to: '/admin/dashboard',
    label: 'Métricas Principales',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    strokeWidth: '2.5',
  },
  {
    to: '/admin/promotions',
    label: 'Promociones',
    icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
    strokeWidth: '2',
  },
  {
    to: '/admin/customers',
    label: 'Clientes',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    strokeWidth: '2',
  },
  {
    to: '/admin/settings',
    label: 'Configuración',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    strokeWidth: '2',
  },
] as const;

// El sidebar es un drawer solo bajo el breakpoint md; en escritorio está siempre visible.
const MOBILE_QUERY = '(max-width: 767px)';

const ROLE_LABELS: Record<MerchantRole, string> = {
  OWNER: 'Administrador',
  STAFF: 'Cajero',
};

export function Layout({ session, role }: { session: Session | null; role: MerchantRole | null }) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useMediaQuery(MOBILE_QUERY);

  // Cerrado y en móvil, el drawer sigue en el DOM: hay que sacarlo del orden de
  // tabulación y del árbol de accesibilidad o se puede navegar a ciegas.
  const isSidebarHidden = isMobile && !isSidebarOpen;

  const closeSidebar = () => setIsSidebarOpen(false);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSidebarOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex w-full bg-slate-100/50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue to-blue-600 flex items-center justify-center text-white font-black shadow-md">
            W
          </div>
          <span className="text-lg font-extrabold tracking-tight">Fidelity</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Abrir menú"
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
      </div>

      {/* Backdrop for mobile sidebar */}
      {isSidebarOpen && (
        <button
          aria-label="Cerrar menú"
          onClick={closeSidebar}
          className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
        />
      )}

      {/* Sidebar with Glassmorphism and Strong Shadow */}
      <aside
        aria-hidden={isSidebarHidden}
        inert={isSidebarHidden}
        className={`w-72 bg-white/95 dark:bg-slate-900/95 md:bg-white/80 md:dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800/80 p-6 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-40 fixed inset-y-0 left-0 transform transition-transform duration-300 md:sticky md:top-0 md:translate-x-0 md:h-screen ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-blue to-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-brand-blue/30 border border-blue-400/30">
              W
            </div>
            <span className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">Fidelity</span>
          </div>
          <button
            onClick={toggleDarkMode}
            aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-all border border-transparent hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>

        <nav className="space-y-2 flex-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={NAV_LINK_CLASSES} onClick={closeSidebar}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={item.strokeWidth} d={item.icon}></path>
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 mb-4 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold border border-white dark:border-slate-600 shadow-sm">
                L
             </div>
             <div className="overflow-hidden text-ellipsis">
               <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{session?.user?.email}</p>
               <p className="text-xs text-slate-500">{role ? ROLE_LABELS[role] : 'Sin rol asignado'}</p>
             </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-3 w-full rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 font-bold transition-all border border-transparent hover:border-red-100 dark:hover:border-red-500/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-6 pt-20 md:p-14 overflow-y-auto relative z-10">
        {/* Decorative Background Elements for depth */}
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-brand-blue/5 dark:bg-brand-blue/10 rounded-full blur-3xl pointer-events-none -z-10 translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-yellow/5 dark:bg-brand-yellow/10 rounded-full blur-3xl pointer-events-none -z-10 -translate-x-1/3 translate-y-1/3" />

        <Outlet />
      </main>
    </div>
  );
}
