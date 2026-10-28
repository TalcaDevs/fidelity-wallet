import { Link } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { ROUTES } from './routing/routePaths';

/** Banner de prueba de §6.5: solo con VITE_FEATURE_BILLING (lo decide el Layout). */
export function TrialBanner({ brandId }: { brandId: string | null }) {
  const { subscription, trialDaysLeft } = useSubscription(brandId);
  if (subscription?.status !== 'TRIALING' || trialDaysLeft <= 0) return null;

  return (
    <aside
      aria-label="Aviso de periodo de prueba"
      className="relative z-30 flex items-center justify-between gap-3 border-b border-sky-200/80 bg-sky-100/90 text-sky-950 dark:border-sky-800/80 dark:bg-sky-950/80 dark:text-sky-100 px-4 py-2 sm:px-6 lg:px-10 text-xs sm:text-sm font-medium transition-colors"
    >
      <div className="flex items-center gap-2 truncate">
        <span className="inline-block w-2 h-2 rounded-full bg-sky-500 animate-pulse shrink-0" aria-hidden="true" />
        <span className="truncate">
          Estás en periodo de prueba — te {trialDaysLeft === 1 ? 'queda 1 día' : `quedan ${trialDaysLeft} días`}.
        </span>
      </div>
      <Link
        to={ROUTES.billing}
        className="bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white px-3 py-1 sm:px-3.5 sm:py-1 rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 whitespace-nowrap"
      >
        Suscribirme
      </Link>
    </aside>
  );
}
