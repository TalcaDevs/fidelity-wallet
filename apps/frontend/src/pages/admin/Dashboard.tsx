import { PanelTitle } from '../../components/admin/PanelTitle';
import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { StatCard } from '../../components/ui/StatCard';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { maskIdentifier } from '../../lib/maskIdentifier';
import { PANEL_HEADING, PANEL_SURFACE } from '../../components/admin/panelStyles';

const PASSES_ICON = <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>;
const STAMPS_ICON = <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;
const REWARDS_ICON = <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path></svg>;

export function Dashboard({ session, brandId }: { session: Session | null; brandId: string | null }) {
  const { stats, loading, error, fetchStats } = useDashboardStats();

  useEffect(() => {
    if (brandId) {
      fetchStats(brandId);
    }
  }, [brandId, fetchStats]);

  const { activePasses, stampsDelivered, rewardsRedeemed, recentScans } = stats;

  return (
    <>
      <header className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-panel-accent">Tu programa de fidelización</p>
        <h1 className={`${PANEL_HEADING} break-words`}><PanelTitle text="Bienvenido," /> {session?.user?.email || 'Local'}</h1>
        <p className="mt-2 text-sm sm:text-base text-panel-muted">Aquí tienes un resumen del rendimiento de tu programa de lealtad.</p>
      </header>

      {error && <ErrorAlert message="Error al cargar los datos del dashboard. Por favor, intenta de nuevo." />}

      <div data-panel-stagger className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 mb-8">
        <StatCard
          title="Pases Activos"
          value={activePasses}
          icon={PASSES_ICON}
          color="blue"
          footnote="Total acumulado"
          footnoteTone="neutral"
          loading={loading}
        />
        <StatCard
          title="Cargas Registradas"
          value={stampsDelivered}
          icon={STAMPS_ICON}
          color="yellow"
          footnote="Total acumulado"
          footnoteTone="neutral"
          loading={loading}
        />
        <StatCard
          title="Premios Canjeados"
          value={rewardsRedeemed}
          icon={REWARDS_ICON}
          color="orange"
          footnote="Total histórico"
          footnoteTone="neutral"
          loading={loading}
        />
      </div>

      <div data-panel-reveal className={`${PANEL_SURFACE} p-4 sm:p-6 lg:p-8`}>
        <h2 className="text-lg sm:text-xl font-bold mb-6 flex flex-wrap items-center gap-3">
          Actividad Reciente
        </h2>
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4" data-testid="recent-activity-skeleton">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[76px] rounded-2xl bg-panel-soft animate-pulse" />
              ))}
            </div>
          ) : recentScans.length === 0 ? (
            <p className="text-panel-muted">No hay actividad reciente.</p>
          ) : (
            recentScans.map((scan) => {
              const customer = scan.customer;
              const identifier = maskIdentifier(customer?.rut) ?? maskIdentifier(customer?.phone) ?? 'Anónimo';
              const isReward = scan.type === 'REWARD_REDEEMED';
              const isManual = scan.method === 'MANUAL' || scan.method === 'PANEL';
              return (
                <div key={scan.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3 sm:p-4 rounded-xl hover:bg-panel-soft transition-colors border border-panel-border/60">
                  <div className="flex min-w-0 items-center gap-3">
                    <div aria-hidden="true" className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center [&>svg]:h-5 [&>svg]:w-5 ${isReward ? 'bg-panel-orange/10 text-panel-orange' : 'bg-panel-accent/10 text-panel-accent'}`}>
                      {isReward ? REWARDS_ICON : STAMPS_ICON}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-sm">{isReward ? 'Premio Canjeado' : 'Cliente escaneado'}</p>
                        {scan.method && (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            isManual
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                              : 'bg-panel-soft text-panel-muted '
                          }`}>
                            {scan.method === 'PANEL' ? 'Panel' : isManual ? 'Manual' : 'QR'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-panel-muted">{identifier}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${isReward ? 'bg-panel-orange/10 text-panel-orange' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'}`}>
                      {isReward ? 'Premio' : '+1 Sello'}
                    </span>
                    <p className="text-sm text-panel-muted mt-2 font-medium">
                      {new Date(scan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
