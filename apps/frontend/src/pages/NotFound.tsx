import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-6 text-3xl font-black">
        404
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Esta página no existe</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
        El enlace que seguiste no corresponde a ninguna sección del panel.
      </p>
      <Link
        to="/dashboard"
        className="px-6 py-3 bg-brand-blue hover:bg-blue-600 text-white shadow-lg shadow-brand-blue/20 rounded-xl font-bold transition-all"
      >
        Volver a Métricas
      </Link>
    </div>
  );
}
