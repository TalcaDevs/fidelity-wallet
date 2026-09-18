import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Layout({ session }: { session: any }) {
  const [isDarkMode, setIsDarkMode] = useState(() => 
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex w-full bg-slate-100/50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
      
      {/* Sidebar with Glassmorphism and Strong Shadow */}
      <aside className="w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800/80 p-6 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 relative">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-blue to-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-brand-blue/30 border border-blue-400/30">
              W
            </div>
            <span className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">Fidelity</span>
          </div>
          <button 
            onClick={toggleDarkMode} 
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition-all border border-transparent hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
        
        <nav className="space-y-4 flex-1">
          <NavLink 
            to="/dashboard"
            className={({ isActive }) => 
              `flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300 ${
                isActive 
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30 translate-x-1' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
              }`
            }
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            Métricas Principales
          </NavLink>
          <NavLink 
            to="/promotions"
            className={({ isActive }) => 
              `flex items-center gap-3 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300 ${
                isActive 
                  ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30 translate-x-1' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
              }`
            }
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
            Promociones Activas
          </NavLink>
        </nav>

        <div className="mt-auto">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 mb-4 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold border border-white dark:border-slate-600 shadow-sm">
                L
             </div>
             <div className="overflow-hidden text-ellipsis">
               <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{session?.user?.email}</p>
               <p className="text-xs text-slate-500">Administrador</p>
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
      <main className="flex-1 p-10 md:p-14 overflow-y-auto relative z-10">
        {/* Decorative Background Elements for depth */}
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-brand-blue/5 dark:bg-brand-blue/10 rounded-full blur-3xl pointer-events-none -z-10 translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-yellow/5 dark:bg-brand-yellow/10 rounded-full blur-3xl pointer-events-none -z-10 -translate-x-1/3 translate-y-1/3" />
        
        <Outlet />
      </main>
    </div>
  );
}
