import { useState } from 'react';
import {
  CATALOG_PLANS,
  getPlan,
  type Plan,
  type PlanUsage,
  type SubscriptionStatus,
} from '@fidelity/shared';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { useSubscription } from '../../hooks/useSubscription';
import { formatDate } from '../../lib/formatDate';

// Mockup de HANDOFF §6.5: el plan y las boletas son simulados; el uso es real.

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: 'En prueba',
  ACTIVE: 'Activo',
  PAST_DUE: 'Prueba vencida',
  CANCELED: 'Cancelado',
};

const USAGE_ROWS: { key: keyof PlanUsage; label: string }[] = [
  { key: 'programs', label: 'Programas de lealtad' },
  { key: 'locations', label: 'Sucursales' },
  { key: 'teamUsers', label: 'Usuarios de equipo' },
  { key: 'customers', label: 'Clientes' },
];

const SIMULATED_INVOICES = [
  { id: 'SIM-002', date: '2026-09-01T12:00:00Z', plan: 'Prueba gratis', amountUsd: 0, status: 'Pagada' },
  { id: 'SIM-001', date: '2026-08-01T12:00:00Z', plan: 'Prueba gratis', amountUsd: 0, status: 'Pagada' },
];

const SOON = 'Próximamente';

function planFeatures(plan: Plan): string[] {
  const { limits, features } = plan;
  return [
    `${limits.programs} ${limits.programs === 1 ? 'programa' : 'programas'} de lealtad`,
    `${limits.locations} ${limits.locations === 1 ? 'sucursal' : 'sucursales'}`,
    `${limits.teamUsers} ${limits.teamUsers === 1 ? 'usuario' : 'usuarios'} de equipo`,
    limits.customers === null ? 'Clientes ilimitados' : `Hasta ${limits.customers} clientes`,
    'Apple y Google Wallet',
    ...(features.pushNotifications ? ['Notificaciones push y por ubicación'] : []),
    features.advancedMetrics ? 'Métricas avanzadas y exportar a Excel' : 'Métricas básicas',
  ];
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const percent = limit === null ? 0 : Math.min(100, (used / limit) * 100);
  const nearLimit = limit !== null && percent >= 80;
  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50">
      <div className="flex justify-between items-center mb-3 gap-2">
        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{label}</span>
        <span className="text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">
          {used} <span className="text-slate-400 font-medium">de {limit ?? '∞'}</span>
        </span>
      </div>
      <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${nearLimit ? 'bg-orange-500' : 'bg-brand-blue'}`}
          style={{ width: `${limit === null ? 100 : percent}%` }}
        />
      </div>
    </div>
  );
}

function PlanCard({ plan, isAnnual, isCurrent }: { plan: Plan; isAnnual: boolean; isCurrent: boolean }) {
  const price = isAnnual && plan.priceUsdMonthlyAnnual !== null ? plan.priceUsdMonthlyAnnual : plan.priceUsdMonthly;
  return (
    <div className={`bg-white dark:bg-slate-800/80 rounded-3xl p-6 border flex flex-col ${plan.highlighted ? 'border-brand-blue shadow-xl shadow-brand-blue/10' : 'border-slate-200 dark:border-slate-700'}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="text-xl font-black text-slate-900 dark:text-white">{plan.name}</h3>
        {plan.highlighted && <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-md">{plan.tagline}</span>}
      </div>
      {!plan.highlighted && <p className="text-sm text-slate-500 mb-1">{plan.tagline}</p>}
      <div className="my-4">
        <span className="text-4xl font-black text-slate-900 dark:text-white">USD {price}</span>
        <span className="text-slate-500 font-medium text-sm"> /mes</span>
        {isAnnual && plan.priceUsdMonthlyAnnual !== null && (
          <p className="text-xs text-slate-500 mt-1">Facturado anualmente (USD {plan.priceUsdMonthlyAnnual * 12} al año)</p>
        )}
      </div>
      <ul className="space-y-3 mb-6 flex-1 text-sm text-slate-600 dark:text-slate-300 font-medium">
        {planFeatures(plan).map((feature) => (
          <li key={feature} className="flex gap-2">
            <span className="text-brand-blue font-black" aria-hidden>✓</span>
            {feature}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled
        title={SOON}
        className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 font-bold cursor-not-allowed"
      >
        {isCurrent ? 'Tu plan actual' : plan.id === 'TRIAL' ? 'Prueba gratis' : 'Cambiar plan'}
      </button>
    </div>
  );
}

export function Billing({ brandId }: { brandId: string | null }) {
  const [isAnnual, setIsAnnual] = useState(false);
  const { subscription, trialDaysLeft, loading, error } = useSubscription(brandId);

  if (error) return <ErrorAlert message={error} />;
  if (loading || !subscription) {
    return <div className="animate-pulse h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl max-w-7xl mx-auto" />;
  }

  const currentPlan = getPlan(subscription.planId);
  const periodText =
    subscription.status === 'TRIALING'
      ? `Te ${trialDaysLeft === 1 ? 'queda 1 día' : `quedan ${trialDaysLeft} días`} de prueba (hasta el ${formatDate(subscription.trialEndsAt ?? subscription.currentPeriodEnd)}).`
      : `Período actual hasta el ${formatDate(subscription.currentPeriodEnd)}.`;

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Facturación y planes</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Tu plan, el uso de tu cuenta y tus boletas.</p>
      </div>

      <section className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 md:p-10 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/20 dark:shadow-none">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Tu plan actual</h2>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-4xl font-black text-slate-900 dark:text-white">{currentPlan.name}</span>
              <span className="text-slate-600 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg text-sm">
                {STATUS_LABELS[subscription.status]}
              </span>
            </div>
            <p className="text-slate-500 mt-2">{periodText}</p>
          </div>
          <button type="button" disabled title={SOON} className="px-6 py-3 rounded-xl bg-brand-blue/40 text-white font-bold cursor-not-allowed">
            Suscribirme
          </button>
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Uso de tu plan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {USAGE_ROWS.map(({ key, label }) => (
            <UsageBar key={key} label={label} used={subscription.usage[key]} limit={currentPlan.limits[key]} />
          ))}
        </div>
      </section>

      <section>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Planes</h2>
          <p className="text-slate-500 max-w-2xl mx-auto mb-6">
            Cada programa de lealtad es una tarjeta distinta en tu panel. El límite es de programas activos; tus clientes son ilimitados desde el plan Inicial.
          </p>
          <div className="inline-flex items-center p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl" role="group" aria-label="Ciclo de facturación">
            {[false, true].map((annual) => (
              <button
                key={String(annual)}
                type="button"
                aria-pressed={isAnnual === annual}
                onClick={() => setIsAnnual(annual)}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${isAnnual === annual ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {annual ? 'Anual' : 'Mensual'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {CATALOG_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} isAnnual={isAnnual} isCurrent={plan.id === subscription.planId} />
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Historial de boletas</h2>
        <p className="text-sm text-slate-500 mb-6">Datos de ejemplo: todavía no hay cobros reales.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[480px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                <th className="pb-4 pl-4 font-bold">Fecha</th>
                <th className="pb-4 font-bold">Plan</th>
                <th className="pb-4 font-bold">Monto</th>
                <th className="pb-4 font-bold">Estado</th>
                <th className="pb-4 pr-4 font-bold text-right">Boleta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {SIMULATED_INVOICES.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="py-4 pl-4 text-slate-900 dark:text-white font-medium">{formatDate(invoice.date)}</td>
                  <td className="py-4 text-slate-600 dark:text-slate-300 font-bold">{invoice.plan}</td>
                  <td className="py-4 text-slate-600 dark:text-slate-300">USD {invoice.amountUsd}</td>
                  <td className="py-4">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">{invoice.status}</span>
                  </td>
                  <td className="py-4 pr-4 text-right">
                    <button type="button" disabled title={SOON} className="px-3 py-1.5 rounded-lg text-sm font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 cursor-not-allowed">
                      Descargar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
