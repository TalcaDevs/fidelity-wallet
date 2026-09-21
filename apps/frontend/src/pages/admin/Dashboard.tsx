import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { StatCard } from '../../components/ui/StatCard';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { maskIdentifier } from '../../lib/maskIdentifier';

const PASSES_ICON = <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>;
const STAMPS_ICON = <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;
const REWARDS_ICON = <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path></svg>;

export function Dashboard({ session, merchantId }: { session: Session | null; merchantId: string | null }) {
  const { stats, loading, error, fetchStats } = useDashboardStats();

  useEffect(() => {
    if (merchantId) {
      fetchStats(merchantId);
    }
  }, [merchantId, fetchStats]);

  const { activePasses, stampsDelivered, rewardsRedeemed, recentScans } = stats;

  return (
    <>
      <header className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Bienvenido, {session?.user?.email || 'Local'}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">Aquí tienes un resumen del rendimiento de tu programa de lealtad hoy.</p>
      </header>

      {error && <ErrorAlert message="Error al cargar los datos del dashboard. Por favor, intenta de nuevo." />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <StatCard
          title="Pases Activos"
          value={activePasses}
          icon={PASSES_ICON}
          color="blue"
          footnote="Total acumulado"
          loading={loading}
        />
        <StatCard
          title="Sellos Entregados"
          value={stampsDelivered}
          icon={STAMPS_ICON}
          color="yellow"
          footnote="Total acumulado"
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

      <div className="bg-white dark:bg-slate-800 p-10 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
          Actividad Reciente
          <span className="bg-brand-blue/10 text-brand-blue text-xs px-3 py-1 rounded-full font-bold">En vivo</span>
        </h2>
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4" data-testid="recent-activity-skeleton">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[76px] rounded-2xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          ) : recentScans.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No hay actividad reciente.</p>
          ) : (
            recentScans.map((scan) => {
              const customer = scan.customer;
              const identifier = maskIdentifier(customer?.rut) ?? maskIdentifier(customer?.phone) ?? 'Anónimo';
              const isReward = scan.type === 'REWARD_REDEEMED';
              return (
                <div key={scan.id} className="flex items-center justify-between p-5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${isReward ? 'bg-brand-orange/10 text-brand-orange' : 'bg-brand-blue/10 text-brand-blue'}`}>
                      {isReward ? '🎁' : 'S'}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{isReward ? 'Premio Canjeado' : 'Cliente escaneado'}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{identifier}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${isReward ? 'bg-brand-orange/10 text-brand-orange' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'}`}>
                      {isReward ? 'Premio' : '+1 Sello'}
                    </span>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 font-medium">
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
