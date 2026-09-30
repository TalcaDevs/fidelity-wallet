import { Link } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { ROUTES } from './routing/routePaths';

/** Banner de prueba de §6.5: solo con VITE_FEATURE_BILLING (lo decide el Layout). */
export function TrialBanner({ brandId }: { brandId: string | null }) {
  const { subscription, trialDaysLeft } = useSubscription(brandId);
  if (subscription?.status !== 'TRIALING' || trialDaysLeft <= 0) return null;

  return (
    <div className="mb-8 rounded-2xl bg-gradient-to-r from-brand-blue to-blue-600 text-white px-5 py-3 text-sm font-medium flex flex-wrap items-center gap-3 shadow-lg shadow-brand-blue/20">
      <span>
        Estás en periodo de prueba — te {trialDaysLeft === 1 ? 'queda 1 día' : `quedan ${trialDaysLeft} días`}.
      </span>
      <Link
        to={ROUTES.billing}
        className="ml-auto bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors whitespace-nowrap"
      >
        Suscribirme
      </Link>
    </div>
  );
}
