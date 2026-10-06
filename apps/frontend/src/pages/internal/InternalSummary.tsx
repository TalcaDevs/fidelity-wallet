import { Link } from 'react-router-dom';
import { CATALOG_PLANS, type InternalSummaryDto } from '@fidelity/shared';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { useAsyncData } from '../../hooks/useAsyncData';
import { getSummary } from '../../services/internalService';
import { CARD, PageHeader } from './ui';

const dateFmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' });
const weekdayFmt = new Intl.DateTimeFormat('es-CL', { weekday: 'short', timeZone: 'UTC' });

function Stat({ label, value, to, tone = 'default' }: { label: string; value: number; to?: string; tone?: 'default' | 'warn' }) {
  const body = (
    <>
      <p className="text-sm font-bold text-panel-muted">{label}</p>
      <p className={`text-3xl font-extrabold mt-1 ${tone === 'warn' && value > 0 ? 'text-panel-orange' : ''}`}>{value}</p>
    </>
  );
  return to ? (
    <Link to={to} className={`${CARD} p-5 block hover:border-panel-accent/50 transition-colors`}>{body}</Link>
  ) : (
    <div className={`${CARD} p-5`}>{body}</div>
  );
}

function Activity({ days }: { days: InternalSummaryDto['activity'] }) {
  const max = Math.max(1, ...days.map((d) => d.stamps + d.redemptions));
  return (
    <div className={`${CARD} p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
        <h2 className="text-lg font-bold">Actividad de los últimos 7 días</h2>
        <div className="flex gap-4 text-xs font-bold text-panel-muted">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-panel-primary" />Sellos</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-panel-gold" />Canjes</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-48">
        {days.map((d) => (
          <div key={d.date} className="flex flex-col items-center justify-end h-full gap-1" title={`${d.stamps} sellos · ${d.redemptions} canjes · ${d.newCustomers} clientes nuevos`}>
            <span className="text-xs font-bold text-panel-muted">{d.stamps + d.redemptions}</span>
            <div className="w-full max-w-10 flex flex-col justify-end rounded-lg overflow-hidden bg-panel-soft" style={{ height: '100%' }}>
              <div className="bg-panel-gold" style={{ height: `${(d.redemptions / max) * 100}%` }} />
              <div className="bg-panel-primary" style={{ height: `${(d.stamps / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 sm:gap-4 mt-2 text-center text-xs text-panel-muted">
        {days.map((d) => (
          <div key={d.date}>
            <p className="font-bold capitalize">{weekdayFmt.format(new Date(`${d.date}T12:00:00Z`))}</p>
            <p>+{d.newCustomers} clientes</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Portada de /internal: cómo está la plataforma hoy y qué requiere atención. */
export function InternalSummary() {
  const { data, error, loading } = useAsyncData(getSummary);

  return (
    <div className="space-y-6">
      <PageHeader title="Resumen" subtitle="El estado de la plataforma hoy." />
      {error && <ErrorAlert message={error} />}

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-panel-soft animate-pulse" />)}
        </div>
      ) : data && (
        <>
          <section data-panel-stagger aria-label="Tickets" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Tickets abiertos" value={data.tickets.open} to="/internal/tickets" />
            <Stat label="Sin asignar" value={data.tickets.unassigned} to="/internal/tickets" tone="warn" />
            <Stat label="Urgentes" value={data.tickets.urgent} to="/internal/tickets" tone="warn" />
            <Stat label="Esperando al comercio" value={data.tickets.waitingOnMerchant} to="/internal/tickets" />
          </section>

          <section data-panel-stagger aria-label="Marcas" className="grid gap-4 lg:grid-cols-3">
            <div className={`${CARD} p-6`}>
              <h2 className="text-lg font-bold mb-4">Marcas</h2>
              <p className="text-4xl font-extrabold">{data.brands.total}</p>
              <p className="text-sm text-panel-muted mt-1">
                {data.brands.active} activas · <span className={data.brands.suspended > 0 ? 'text-red-600 font-bold' : ''}>{data.brands.suspended} suspendidas</span>
              </p>
              <ul className="mt-5 space-y-2">
                {CATALOG_PLANS.map((plan) => (
                  <li key={plan.id} className="flex justify-between text-sm">
                    <span className="text-panel-muted">{plan.name}</span>
                    <span className="font-bold">{data.brands.byPlan[plan.id] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`${CARD} p-6 lg:col-span-2`}>
              <div className="flex items-baseline justify-between gap-2 mb-4">
                <h2 className="text-lg font-bold">Pruebas que vencen esta semana</h2>
                {data.trials.expired > 0 && (
                  <span className="text-sm font-bold text-panel-orange">{data.trials.expired} ya vencidas</span>
                )}
              </div>
              {data.trials.endingSoon.length === 0 ? (
                <p className="text-panel-muted">Ninguna prueba vence en los próximos 7 días.</p>
              ) : (
                <ul className="divide-y divide-panel-border">
                  {data.trials.endingSoon.map((b) => (
                    <li key={b.id} className="flex justify-between py-2.5">
                      <Link to={`/internal/brands/${b.id}`} className="font-bold text-panel-accent hover:underline">{b.name}</Link>
                      <span className="text-sm text-panel-muted">vence el {dateFmt.format(new Date(b.trialEndsAt))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <Activity days={data.activity} />
        </>
      )}
    </div>
  );
}
