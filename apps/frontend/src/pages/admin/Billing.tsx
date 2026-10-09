import { PanelTitle } from '../../components/admin/PanelTitle';
import { useState } from 'react';
import {
  CATALOG_PLANS,
  getPlan,
  type Plan,
  type PlanUsage,
  type SubscriptionStatus,
} from '@fidelity/shared';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../components/routing/routePaths';
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
  { id: 'SIM-002', date: '2026-09-01T12:00:00Z', plan: 'Prueba gratis', amountClp: 0, status: 'Pagada' },
  { id: 'SIM-001', date: '2026-08-01T12:00:00Z', plan: 'Prueba gratis', amountClp: 0, status: 'Pagada' },
];

const SOON = 'Próximamente';

function planFeatures(plan: Plan): string[] {
  const { limits, features } = plan;
  return [
    `${limits.programs} ${limits.programs === 1 ? 'programa' : 'programas'} de lealtad`,
    `${limits.locations} ${limits.locations === 1 ? 'sucursal' : 'sucursales'}`,
    `${limits.teamUsers} ${limits.teamUsers === 1 ? 'usuario' : 'usuarios'} de equipo`,
    limits.customers === null ? 'Clientes ilimitados' : `Hasta ${limits.customers} clientes`,
    `Hasta ${limits.rewards} recompensas activas`,
    'Apple y Google Wallet',
    ...(features.pushNotifications ? ['Notificaciones push y por ubicación'] : []),
    features.advancedMetrics ? 'Métricas avanzadas y exportar a Excel' : 'Métricas básicas',
  ];
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const percent = limit === null ? 0 : Math.min(100, (used / limit) * 100);
  const nearLimit = limit !== null && percent >= 80;
  return (
    <div className="bg-panel-soft rounded-2xl p-5 border border-panel-border">
      <div className="flex justify-between items-center mb-3 gap-2">
        <span className="text-sm font-bold text-panel-muted">{label}</span>
        <span className="text-sm font-black text-panel-text whitespace-nowrap">
          {used} <span className="text-panel-muted font-medium">de {limit ?? '∞'}</span>
        </span>
      </div>
      <div className="h-2.5 w-full bg-panel-muted/20 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${nearLimit ? 'bg-orange-500' : 'bg-panel-primary'}`}
          style={{ width: `${limit === null ? 100 : percent}%` }}
        />
      </div>
    </div>
  );
}

function PlanCard({ plan, isAnnual, isCurrent }: { plan: Plan; isAnnual: boolean; isCurrent: boolean }) {
  const price = isAnnual && plan.priceClpMonthlyAnnual !== null ? plan.priceClpMonthlyAnnual : plan.priceClpMonthly;
  return (
    <div className={`bg-panel-surface rounded-2xl p-6 border flex flex-col ${plan.highlighted ? 'border-panel-accent shadow-xl shadow-brand-blue/10' : 'border-panel-border '}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="text-xl font-black text-panel-text">{plan.name}</h3>
        {plan.highlighted && <span className="text-[10px] font-bold uppercase tracking-wider bg-panel-accent/10 text-panel-accent px-2 py-0.5 rounded-md">{plan.tagline}</span>}
      </div>
      <p className={`text-sm mb-1 ${plan.highlighted ? 'opacity-0 select-none' : 'text-panel-muted'}`} aria-hidden={plan.highlighted}>
        {plan.tagline}
      </p>
      <div className="my-4">
        <span className="text-4xl font-black text-panel-text">$ {price.toLocaleString('es-CL')}</span>
        <span className="text-panel-muted font-medium text-sm"> /mes</span>
        {isAnnual && plan.priceClpMonthlyAnnual !== null && (
          <p className="text-xs text-panel-muted mt-1">Facturado anualmente ($ {(plan.priceClpMonthlyAnnual * 12).toLocaleString('es-CL')} al año)</p>
        )}
      </div>
      <ul className="space-y-3 mb-6 flex-1 text-sm text-panel-muted font-medium">
        {planFeatures(plan).map((feature) => (
          <li key={feature} className="flex gap-2">
            <span className="text-panel-accent font-black" aria-hidden>✓</span>
            {feature}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled
        title={SOON}
        className="w-full py-3 rounded-xl bg-panel-soft text-panel-muted font-bold cursor-not-allowed"
      >
        {isCurrent ? 'Tu plan actual' : plan.id === 'TRIAL' ? 'Prueba gratis' : 'Cambiar plan'}
      </button>
    </div>
  );
}

export function Billing({
  brandId,
  isSuspended = false,
}: {
  brandId: string | null;
  isSuspended?: boolean;
}) {
  const [isAnnual, setIsAnnual] = useState(false);
  const { subscription, trialDaysLeft, loading, error } = useSubscription(brandId);

  if (error) return <ErrorAlert message={error} />;
  if (loading || !subscription) {
    return <div className="animate-pulse h-64 bg-panel-soft rounded-2xl max-w-7xl mx-auto" />;
  }

  const currentPlan = getPlan(subscription.planId);
  const periodText = isSuspended
    ? 'Servicio pausado por suspensión. Contacta a soporte para reactivarlo.'
    : subscription.status === 'TRIALING'
      ? `Te ${trialDaysLeft === 1 ? 'queda 1 día' : `quedan ${trialDaysLeft} días`} de prueba (hasta el ${formatDate(subscription.trialEndsAt ?? subscription.currentPeriodEnd)}).`
      : `Período actual hasta el ${formatDate(subscription.currentPeriodEnd)}.`;

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-panel-text"><PanelTitle text="Facturación y planes" /></h1>
        <p className="text-panel-muted mt-2 text-sm sm:text-base">Tu plan, el uso de tu cuenta y tus boletas.</p>
      </div>

      {isSuspended && (
        <div
          data-panel-reveal
          role="alert"
          className="rounded-2xl border border-red-500/30 bg-red-500/10 dark:bg-red-950/20 p-6 md:p-8 text-panel-text shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl font-black">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">
                Tu cuenta se encuentra suspendida por mora
              </h2>
              <p className="text-sm sm:text-base text-panel-muted leading-relaxed">
                El acceso a las funciones operativas (escáner, clientes, métricas y locales) ha sido pausado temporalmente debido a pagos pendientes. Tus datos y clientes permanecen completamente seguros y guardados.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to={ROUTES.support}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Contactar a Soporte</span>
                </Link>
                <span className="text-xs text-panel-muted">
                  Escríbenos para regularizar tu situación y reactivar tu servicio de inmediato.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <section data-panel-reveal className="bg-panel-surface rounded-2xl p-6 md:p-10 border border-panel-border shadow-panel">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-sm font-bold text-panel-muted uppercase tracking-wider mb-2">Tu plan actual</h2>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-4xl font-black text-panel-text">{currentPlan.name}</span>
              <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                isSuspended
                  ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20'
                  : 'bg-panel-soft text-panel-muted font-medium'
              }`}>
                {isSuspended ? 'Suspendido por mora' : STATUS_LABELS[subscription.status]}
              </span>
            </div>
            <p className="text-panel-muted mt-2">{periodText}</p>
          </div>
          {isSuspended ? (
            <Link
              to={ROUTES.support}
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors text-center"
            >
              Contactar Soporte
            </Link>
          ) : (
            <button type="button" disabled title={SOON} className="px-6 py-3 rounded-xl bg-panel-accent/40 text-white font-bold cursor-not-allowed">
              Suscribirme
            </button>
          )}
        </div>

        <h3 className="text-lg font-bold text-panel-text mb-6">Uso de tu plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {USAGE_ROWS.map(({ key, label }) => (
            <UsageBar key={key} label={label} used={subscription.usage[key]} limit={currentPlan.limits[key]} />
          ))}
        </div>
      </section>

      <section>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-panel-text mb-3">Planes</h2>
          <p className="text-panel-muted max-w-2xl mx-auto mb-6">
            Cada programa de lealtad es una tarjeta distinta en tu panel. El límite es de programas activos; tus clientes son ilimitados desde el plan Pro.
          </p>
          <div className="inline-flex items-center p-1.5 bg-panel-soft rounded-2xl" role="group" aria-label="Ciclo de facturación">
            {[false, true].map((annual) => (
              <button
                key={String(annual)}
                type="button"
                aria-pressed={isAnnual === annual}
                onClick={() => setIsAnnual(annual)}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${isAnnual === annual ? 'bg-panel-surface text-panel-text shadow-sm' : 'text-panel-muted hover:text-panel-text '}`}
              >
                {annual ? 'Anual' : 'Mensual'}
              </button>
            ))}
          </div>
        </div>
        <div data-panel-stagger className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {CATALOG_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} isAnnual={isAnnual} isCurrent={plan.id === subscription.planId} />
          ))}
        </div>
      </section>

      <section data-panel-reveal className="bg-panel-surface rounded-2xl p-6 md:p-8 border border-panel-border">
        <h2 className="text-xl font-bold text-panel-text mb-1">Historial de boletas</h2>
        <p className="text-sm text-panel-muted mb-6">Datos de ejemplo: todavía no hay cobros reales.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[480px]">
            <thead>
              <tr className="border-b border-panel-border text-panel-muted text-sm">
                <th className="pb-4 pl-4 font-bold">Fecha</th>
                <th className="pb-4 font-bold">Plan</th>
                <th className="pb-4 font-bold">Monto</th>
                <th className="pb-4 font-bold">Estado</th>
                <th className="pb-4 pr-4 font-bold text-right">Boleta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel-border">
              {SIMULATED_INVOICES.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="py-4 pl-4 text-panel-text font-medium">{formatDate(invoice.date)}</td>
                  <td className="py-4 text-panel-muted font-bold">{invoice.plan}</td>
                  <td className="py-4 text-panel-muted">$ {invoice.amountClp.toLocaleString('es-CL')}</td>
                  <td className="py-4">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">{invoice.status}</span>
                  </td>
                  <td className="py-4 pr-4 text-right">
                    <button type="button" disabled title={SOON} className="px-3 py-1.5 rounded-lg text-sm font-bold text-panel-muted bg-panel-soft cursor-not-allowed">
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
