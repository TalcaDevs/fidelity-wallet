import { Link } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { ROUTES } from './routing/routePaths';

/** Banner de prueba de §6.5: solo con VITE_FEATURE_BILLING (lo decide el Layout). */
export function TrialBanner({ brandId }: { brandId: string | null }) {
  const { subscription, trialDaysLeft } = useSubscription(brandId);
  if (subscription?.status !== 'TRIALING' || trialDaysLeft <= 0) return null;

  return (
    <div data-panel-reveal className="mb-8 rounded-2xl border border-panel-accent/20 bg-panel-accent/10 text-panel-text px-5 py-4 text-sm font-medium flex flex-wrap items-center gap-3">
      <span>
        Estás en periodo de prueba — te {trialDaysLeft === 1 ? 'queda 1 día' : `quedan ${trialDaysLeft} días`}.
      </span>
      <Link
        to={ROUTES.billing}
        className="ml-auto bg-panel-primary hover:bg-panel-primary/90 text-white px-4 py-3 rounded-xl text-xs font-bold transition-colors whitespace-nowrap"
      >
        Suscribirme
      </Link>
    </div>
  );
}
