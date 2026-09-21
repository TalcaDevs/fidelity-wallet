import { NotFound } from '../pages/NotFound';
import { useTheme } from '../hooks/useTheme';
import { ROUTES } from './routing/routePaths';

// NotFound se escribió para vivir dentro del Layout del panel (hereda fondo y
// clase `dark`). Fuera del panel necesita su propia carcasa, así que este
// envoltorio la aporta sin tocar la página.
export function NotFoundScreen() {
  useTheme();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 flex items-center justify-center px-5 transition-colors duration-300">
      {/* Quien cae acá puede no tener cuenta: la salida es el inicio, no el panel. */}
      <NotFound
        to={ROUTES.home}
        actionLabel="Volver al inicio"
        description="El enlace que seguiste no lleva a ninguna página de este sitio."
      />
    </div>
  );
}
