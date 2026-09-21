import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { ROUTES } from './routing/routePaths';

// Pantalla honesta para rutas ya reservadas pero todavía sin implementar: su
// valor es que la ruta exista (y no caiga en el 404) mientras otro dev la
// construye. useTheme se llama acá porque estas pantallas viven fuera del
// Layout del panel, que es quien normalmente aplica la clase `dark`.
export function PlaceholderScreen({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  useTheme();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center px-5 py-16 transition-colors duration-300">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-blue to-blue-600 items-center justify-center text-white font-black text-2xl shadow-lg shadow-brand-blue/30">
          W
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-wide text-brand-blue">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
          {description}
        </p>

        <div className="mt-8 p-5 rounded-3xl bg-white dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-500 dark:text-slate-400 text-left">
          {children}
        </div>

        <Link
          to={ROUTES.home}
          className="inline-block mt-8 text-sm font-bold text-brand-blue hover:text-blue-500 transition-colors"
        >
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}
