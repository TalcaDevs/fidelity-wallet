import { PanelTitle } from '../../components/admin/PanelTitle';
import { useEffect, useState, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { StatCard } from '../../components/ui/StatCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { maskIdentifier } from '../../lib/maskIdentifier';
import { PANEL_HEADING, PANEL_SURFACE } from '../../components/admin/panelStyles';
import { OnboardingChecklist } from './components/OnboardingChecklist';

const PASSES_ICON = <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>;
const STAMPS_ICON = <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;
const REWARDS_ICON = <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path></svg>;

type ActivityFilter = 'today' | 'week' | 'all';
const SCANS_PAGE_SIZE = 5;

function getScanMethodLabel(method?: string, isManual?: boolean): string {
  if (method === 'PANEL') return 'Panel';
  if (isManual) return 'Manual';
  return 'QR';
}

function getEmptyActivityMessage(hasRecentScans: boolean, filter: ActivityFilter) {
  if (!hasRecentScans) {
    return {
      title: 'No hay actividad reciente.',
      subtitle: 'Los escaneos y canjes que realice tu equipo aparecerán aquí en tiempo real.',
    };
  }
  if (filter === 'today') {
    return {
      title: 'Sin movimientos registrados hoy.',
      subtitle: 'Prueba seleccionando "Todo el tiempo" para ver movimientos anteriores.',
    };
  }
  if (filter === 'week') {
    return {
      title: 'Sin movimientos en los últimos 7 días.',
      subtitle: 'Prueba seleccionando "Todo el tiempo" para ver movimientos anteriores.',
    };
  }
  return {
    title: 'No hay actividad registrada.',
    subtitle: 'Prueba seleccionando "Todo el tiempo" para ver movimientos anteriores.',
  };
}

export function Dashboard({ session, brandId }: { session: Session | null; brandId: string | null }) {
  const { stats, loading, error, fetchStats } = useDashboardStats();
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (brandId) {
      fetchStats(brandId);
    }
  }, [brandId, fetchStats]);

  const { activePasses, stampsDelivered, rewardsRedeemed, recentScans } = stats;

  const filteredScans = useMemo(() => {
    if (activityFilter === 'all') return recentScans;
    const now = new Date();
    return recentScans.filter((scan) => {
      const scanDate = new Date(scan.createdAt);
      if (activityFilter === 'today') {
        return scanDate.toDateString() === now.toDateString();
      }
      if (activityFilter === 'week') {
        const diffMs = now.getTime() - scanDate.getTime();
        return diffMs <= 7 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [recentScans, activityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredScans.length / SCANS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedScans = useMemo(() => {
    const startIndex = (currentPage - 1) * SCANS_PAGE_SIZE;
    return filteredScans.slice(startIndex, startIndex + SCANS_PAGE_SIZE);
  }, [filteredScans, currentPage]);

  const renderRecentActivityContent = () => {
    if (loading) {
      return (
        <div className="space-y-3" data-testid="recent-activity-skeleton">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 sm:h-[76px] rounded-xl sm:rounded-2xl" />
          ))}
        </div>
      );
    }

    if (filteredScans.length === 0) {
      const emptyMsg = getEmptyActivityMessage(recentScans.length > 0, activityFilter);
      return (
        <div className="py-8 text-center">
          <p className="text-sm font-semibold text-panel-text">{emptyMsg.title}</p>
          <p className="text-xs text-panel-muted mt-1">{emptyMsg.subtitle}</p>
        </div>
      );
    }

    return pagedScans.map((scan) => {
      const customer = scan.customer;
      const identifier = maskIdentifier(customer?.rut) ?? maskIdentifier(customer?.phone) ?? 'Cliente sin teléfono';
      const isReward = scan.type === 'REWARD_REDEEMED';
      const isManual = scan.method === 'MANUAL' || scan.method === 'PANEL';
      const methodLabel = getScanMethodLabel(scan.method, isManual);
      const isVoided = Boolean(scan.voidedAt);

      let resultLabel = isReward ? 'Premio' : '+1 Sello';
      if (isVoided) {
        resultLabel = 'Anulado';
      } else if (isReward) {
        resultLabel = 'Premio';
      } else if (scan.pointsEarned && scan.pointsEarned > 0) {
        resultLabel = `+${scan.pointsEarned} Pts`;
      } else if (scan.stampCount && scan.stampCount > 1) {
        resultLabel = `+${scan.stampCount} Sellos`;
      }

      const badgeColor = isVoided
        ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
        : isReward
        ? 'bg-panel-orange/10 text-panel-orange'
        : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';

      return (
        <div
          key={scan.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl hover:bg-panel-soft/70 transition-colors border border-panel-border/60 bg-panel-surface/40"
        >
          {/* Fila superior en móvil / Bloque izquierdo en escritorio */}
          <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div
                aria-hidden="true"
                className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl flex items-center justify-center [&>svg]:h-5 [&>svg]:w-5 ${
                  isVoided
                    ? 'bg-rose-500/10 text-rose-600'
                    : isReward
                    ? 'bg-panel-orange/10 text-panel-orange'
                    : 'bg-panel-accent/10 text-panel-accent'
                }`}
              >
                {isReward ? REWARDS_ICON : STAMPS_ICON}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <p className={`font-semibold text-xs sm:text-sm truncate ${isVoided ? 'line-through text-panel-muted' : 'text-panel-text'}`}>
                    {isVoided ? 'Carga Anulada' : isReward ? 'Premio Canjeado' : 'Cliente escaneado'}
                  </p>
                  {scan.method && (
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                        isManual
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          : 'bg-panel-soft text-panel-muted'
                      }`}
                    >
                      {methodLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-panel-muted truncate hidden sm:block mt-0.5">
                  {identifier}
                </p>
              </div>
            </div>

            {/* En móvil: Badge de resultado a la derecha en la fila superior */}
            <div className="sm:hidden shrink-0">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeColor}`}
              >
                {resultLabel}
              </span>
            </div>
          </div>

          {/* En móvil: Fila inferior con el teléfono del cliente y la hora / En escritorio: Bloque derecho */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-panel-border/40 text-right">
            <span className="text-xs text-panel-muted font-medium sm:hidden">
              {identifier}
            </span>
            <span
              className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${badgeColor}`}
            >
              {resultLabel}
            </span>
            <p className="text-[11px] sm:text-xs text-panel-muted sm:mt-1 font-medium tabular-nums">
              {new Date(scan.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      );
    });
  };

  return (
    <>
      {!loading && activePasses === 0 && stampsDelivered === 0 && (
        <OnboardingChecklist brandId={brandId} />
      )}

      <header className="mb-6 sm:mb-8">
        <p className="mb-1.5 sm:mb-2 text-xs font-bold uppercase tracking-[0.16em] text-panel-accent">
          Tu programa de fidelización
        </p>
        <h1 className={`${PANEL_HEADING} break-words text-2xl sm:text-3xl lg:text-4xl`}>
          <PanelTitle text="Bienvenido," />{' '}
          <span className="font-semibold text-panel-text truncate inline-block max-w-[260px] sm:max-w-none align-bottom">
            {session?.user?.email || 'Local'}
          </span>
        </h1>
        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm lg:text-base text-panel-muted">
          Aquí tienes un resumen del rendimiento de tu programa de lealtad.
        </p>
      </header>

      {error && <ErrorAlert message="Error al cargar los datos del dashboard. Por favor, intenta de nuevo." />}

      {/* Grid de KPIs principales: 1 columna en móvil, 3 columnas balanceadas en tablet y escritorio */}
      <div data-panel-stagger className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-5 lg:gap-6 mb-6 sm:mb-8">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-panel-text">
              Actividad Reciente
            </h2>
            {filteredScans.length > 0 && (
              <span className="text-xs font-semibold text-panel-muted">
                ({filteredScans.length} en total)
              </span>
            )}
          </div>

          {/* Filtro rápido: Hoy / Hace una semana / Todo el tiempo */}
          <div className="inline-flex items-center bg-panel-soft p-1 rounded-xl self-start sm:self-auto gap-1">
            <button
              type="button"
              onClick={() => {
                setActivityFilter('today');
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activityFilter === 'today'
                  ? 'bg-panel-primary text-white shadow-xs'
                  : 'text-panel-muted hover:text-panel-text'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => {
                setActivityFilter('week');
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activityFilter === 'week'
                  ? 'bg-panel-primary text-white shadow-xs'
                  : 'text-panel-muted hover:text-panel-text'
              }`}
            >
              Hace una semana
            </button>
            <button
              type="button"
              onClick={() => {
                setActivityFilter('all');
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                activityFilter === 'all'
                  ? 'bg-panel-primary text-white shadow-xs'
                  : 'text-panel-muted hover:text-panel-text'
              }`}
            >
              Todo el tiempo
            </button>
          </div>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          {renderRecentActivityContent()}
        </div>

        {/* Pasar página (Paginación) en Actividad Reciente */}
        {!loading && filteredScans.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-panel-border/60 mt-4">
            <p className="text-xs text-panel-muted font-medium text-center sm:text-left">
              Mostrando <span className="font-semibold text-panel-text">{(currentPage - 1) * SCANS_PAGE_SIZE + 1} - {Math.min(currentPage * SCANS_PAGE_SIZE, filteredScans.length)}</span> de <span className="font-semibold text-panel-text">{filteredScans.length}</span> movimientos
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Página anterior de movimientos"
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-panel-border bg-panel-surface text-panel-text hover:bg-panel-soft disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Anterior</span>
              </button>
              <span className="text-xs font-semibold text-panel-muted px-2">
                Página <strong className="text-panel-text">{currentPage}</strong> de <strong className="text-panel-text">{totalPages}</strong>
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Página siguiente de movimientos"
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-panel-border bg-panel-surface text-panel-text hover:bg-panel-soft disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1 shadow-2xs"
              >
                <span>Siguiente</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
