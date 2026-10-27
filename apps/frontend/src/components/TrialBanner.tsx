import { Link } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { ROUTES } from './routing/routePaths';

/** Banner compacto integrado en el navbar superior en celeste claro. */
export function TrialBanner({ brandId }: { brandId: string | null }) {
  const { subscription, trialDaysLeft } = useSubscription(brandId);
  if (subscription?.status !== 'TRIALING' || trialDaysLeft <= 0) return null;

  return (
    <div
      data-panel-reveal
      className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-sky-300/80 bg-sky-100/90 dark:border-sky-700/60 dark:bg-sky-950/60 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-sky-900 dark:text-sky-100 shadow-xs"
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
      </span>
      <span className="truncate">
        <span className="hidden sm:inline">Periodo de prueba: </span>
        <strong className="text-sky-700 dark:text-sky-300 font-extrabold">
          {trialDaysLeft === 1 ? '1 día' : `${trialDaysLeft} días`}
        </strong>
      </span>
      <Link
        to={ROUTES.billing}
        className="rounded-lg bg-sky-600 px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-white transition-colors hover:bg-sky-500 cursor-pointer whitespace-nowrap shadow-xs ml-0.5"
      >
        Suscribirme
      </Link>
    </div>
  );
}
