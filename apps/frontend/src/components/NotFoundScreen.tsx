import { NotFound } from '../pages/NotFound';
import { PublicFrame } from './PublicFrame';
import { ROUTES } from './routing/routePaths';

// NotFound se escribió para vivir dentro del Layout del panel (hereda fondo y
// clase `dark`). Fuera del panel necesita su propia carcasa, así que este
// envoltorio la aporta sin tocar la página.
export function NotFoundScreen() {
  return (
    <PublicFrame>
      <div className="flex min-h-[65svh] items-center justify-center px-5">
        {/* Quien cae acá puede no tener cuenta: la salida es el inicio, no el panel. */}
        <NotFound
          to={ROUTES.home}
          actionLabel="Volver al inicio"
          description="El enlace que seguiste no lleva a ninguna página de este sitio."
        />
      </div>
    </PublicFrame>
  );
}
