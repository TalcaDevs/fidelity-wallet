import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { StaffActivityDto, StaffMemberDto } from '@fidelity/shared';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { customerDetailPath } from '../../../../components/routing/routePaths';
import { ErrorAlert } from '../../../../components/ui/ErrorAlert';
import { WALLET_THEME } from '../../../../components/ui/walletTheme';
import { useAsyncData } from '../../../../hooks/useAsyncData';
import { useDialogFocus } from '../../../../hooks/useDialogFocus';
import { ActivityOperationCard } from './ActivityOperationCard';
import { Skeleton, SkeletonCard } from '../../../../components/ui/Skeleton';

type FilterType = 'ALL' | 'STAMPS' | 'REWARDS' | 'MANUAL';
type TimeFilterType = 'today' | 'week' | 'month' | 'all';

const PAGE_SIZE = 10;

const TIME_FILTER_TABS: { id: TimeFilterType; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mes' },
  { id: 'all', label: 'Todo' },
];

/**
 * Modal de auditoría de actividad del personal para el dueño del local.
 * Renderizado vía portal en document.body con soporte completo de modo oscuro (WALLET_THEME),
 * estados de carga skeleton, filtros rápidos por período y tipo de operación, y navegación al cliente.
 */
export function isWithinCalendarPeriod(date: Date, filter: TimeFilterType, now: Date): boolean {
  if (filter === 'all') return true;
  if (isNaN(date.getTime())) return false;
  if (date > now) return false;

  if (filter === 'today') {
    return date.toDateString() === now.toDateString();
  }

  if (filter === 'week') {
    // Semana calendario de lunes a domingo
    const currentDay = now.getDay();
    const distanceToMonday = (currentDay + 6) % 7;
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - distanceToMonday,
      0,
      0,
      0,
      0,
    );
    return date >= startOfWeek && date <= now;
  }

  if (filter === 'month') {
    // Mes calendario: mismo mes y año que el momento actual
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date <= now
    );
  }

  return true;
}

export function ActivitySidebar({
  member,
  onClose,
  onLoadActivity,
}: {
  member: StaffMemberDto;
  onClose: () => void;
  onLoadActivity: (userId: string) => Promise<StaffActivityDto[]>;
}) {
  const navigate = useNavigate();
  const fetcher = useCallback(() => onLoadActivity(member.userId), [onLoadActivity, member.userId]);
  const { data, loading, error } = useAsyncData(fetcher);
  const activity = useMemo(() => data ?? [], [data]);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(true, dialogRef);

  const [filter, setFilter] = useState<FilterType>('ALL');
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const now = useMemo(() => new Date(), []);

  // Filtro por período de tiempo con límites calendario (Hoy, Esta semana, Este mes, Todo)
  const timeFilteredActivity = useMemo(() => {
    if (timeFilter === 'all') return activity;
    return activity.filter((scan) => {
      const scanDate = new Date(scan.createdAt);
      return isWithinCalendarPeriod(scanDate, timeFilter, now);
    });
  }, [activity, timeFilter, now]);

  // Mini-KPIs calculados según el período seleccionado
  const stats = useMemo(() => {
    const stampsOps = timeFilteredActivity.filter((s) => s.type === 'STAMP_ADDED').length;
    const stamps = timeFilteredActivity.reduce((sum, s) => {
      if (s.type !== 'STAMP_ADDED') return sum;
      return sum + (s.stampCount !== undefined ? s.stampCount : 1);
    }, 0);
    const rewards = timeFilteredActivity.filter((s) => s.type === 'REWARD_REDEEMED').length;
    const manual = timeFilteredActivity.filter((s) => s.method === 'MANUAL').length;
    const manualPct = timeFilteredActivity.length > 0 ? Math.round((manual / timeFilteredActivity.length) * 100) : 0;

    // Clientes únicos atendidos
    const uniqueCustomerKeys = new Set<string>();
    for (const scan of timeFilteredActivity) {
      const key = scan.customerId || scan.customerPhone || scan.id;
      if (key) uniqueCustomerKeys.add(key);
    }
    const uniqueCustomers = uniqueCustomerKeys.size;

    return { stamps, stampsOps, rewards, manual, manualPct, uniqueCustomers };
  }, [timeFilteredActivity]);

  // Frecuencia por customerId para detectar clientes recurrentes que coinciden con alertas antifraude
  const customerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const scan of activity) {
      if (scan.customerId) {
        counts.set(scan.customerId, (counts.get(scan.customerId) ?? 0) + 1);
      }
    }
    return counts;
  }, [activity]);

  // Filtro por tipo de operación (Sellos, Canjes, Manuales)
  const filteredActivity = useMemo(() => {
    if (filter === 'STAMPS') return timeFilteredActivity.filter((s) => s.type === 'STAMP_ADDED');
    if (filter === 'REWARDS') return timeFilteredActivity.filter((s) => s.type === 'REWARD_REDEEMED');
    if (filter === 'MANUAL') return timeFilteredActivity.filter((s) => s.method === 'MANUAL');
    return timeFilteredActivity;
  }, [timeFilteredActivity, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredActivity.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedActivity = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredActivity.slice(start, start + PAGE_SIZE);
  }, [filteredActivity, currentPage]);

  const handleNavigateToCustomer = (customerId: string | null | undefined) => {
    if (!customerId) return;
    onClose();
    navigate(customerDetailPath(customerId));
  };

  const displayName = [member.firstName, member.lastName].filter(Boolean).join(' ').trim() || member.name;

  const renderOperationsList = () => {
    if (timeFilteredActivity.length === 0) {
      return (
        <EmptyState
          variant="dashed"
          icon={<span className="text-xl">📅</span>}
          title="Sin actividad en este período"
          subtitle={`No se registraron operaciones ${timeFilter === 'today' ? 'hoy' : timeFilter === 'week' ? 'en esta semana' : 'en este mes'}. Prueba seleccionando otro período o "Todo".`}
          titleClassName="font-bold text-panel-text text-sm"
          subtitleClassName="text-xs text-panel-muted mt-1 max-w-xs mx-auto"
        />
      );
    }

    if (filteredActivity.length === 0) {
      return (
        <EmptyState
          variant="dashed"
          title="Sin resultados para este filtro"
          subtitle="No se encontraron operaciones de este tipo en el historial reciente."
          titleClassName="font-semibold text-panel-text text-sm"
          subtitleClassName="text-xs text-panel-muted mt-1"
        />
      );
    }

    return (
      <div className="space-y-3">
        <ul className="space-y-3" aria-label="Lista de operaciones">
          {pagedActivity.map((scan) => (
            <ActivityOperationCard
              key={scan.id}
              scan={scan}
              visitsCount={scan.customerId ? customerCounts.get(scan.customerId) ?? 0 : 0}
              onNavigateToCustomer={handleNavigateToCustomer}
            />
          ))}
        </ul>

        {/* Paginación si hay más de PAGE_SIZE elementos */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-panel-border text-xs">
            <span className="text-panel-muted font-medium">
              Página <strong className="text-panel-text">{currentPage}</strong> de <strong className="text-panel-text">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-panel-border bg-panel-surface text-panel-text font-bold hover:bg-panel-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-panel-border bg-panel-surface text-panel-text font-bold hover:bg-panel-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLoadingSkeleton = () => (
    <div className="space-y-5" aria-label="Cargando actividad">
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );

  const renderModalBody = () => {
    if (loading) return renderLoadingSkeleton();
    if (error) return <ErrorAlert message={error} />;
    if (activity.length === 0) {
      return (
        <div className="text-center py-12 px-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-panel-soft flex items-center justify-center text-2xl mb-3">
            📋
          </div>
          <p className="font-bold text-panel-text text-base">Sin actividad registrada</p>
          <p className="text-sm text-panel-muted mt-1 max-w-xs mx-auto">
            Este miembro del equipo aún no ha registrado escaneos ni canjes en el sistema.
          </p>
        </div>
      );
    }

    return (
      <>
        {/* Selector de período */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 bg-panel-soft/60 p-2 rounded-2xl border border-panel-border/60">
          <div className="flex items-center gap-1.5 px-1">
            <span className="text-xs font-bold text-panel-text flex items-center gap-1">
              <span>📅</span> Período:
            </span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto" role="group" aria-label="Filtro de período">
            {TIME_FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setTimeFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                  timeFilter === tab.id
                    ? 'bg-panel-primary text-white shadow-xs'
                    : 'text-panel-muted hover:text-panel-text hover:bg-panel-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mini-KPIs superiores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <div className="rounded-xl border border-panel-border bg-panel-soft/60 p-3 text-center">
            <div className="text-xs font-semibold text-panel-muted mb-0.5 flex items-center justify-center gap-1">
              <span>👥</span> Atendidos
            </div>
            <div className="text-xl font-extrabold text-panel-text">
              {`${stats.uniqueCustomers} ${stats.uniqueCustomers === 1 ? 'cliente' : 'clientes'}`}
            </div>
            <div className="text-[10px] text-panel-muted">en este período</div>
          </div>
          <div className="rounded-xl border border-panel-border bg-panel-soft/60 p-3 text-center">
            <div className="text-xs font-semibold text-panel-muted mb-0.5 flex items-center justify-center gap-1">
              <span>🏷️</span> Sellos
            </div>
            <div className="text-xl font-extrabold text-panel-text">{stats.stamps}</div>
            <div className="text-[10px] text-panel-muted">otorgados</div>
          </div>
          <div className="rounded-xl border border-panel-border bg-panel-soft/60 p-3 text-center">
            <div className="text-xs font-semibold text-panel-muted mb-0.5 flex items-center justify-center gap-1">
              <span>🎁</span> Canjes
            </div>
            <div className="text-xl font-extrabold text-panel-text">{stats.rewards}</div>
            <div className="text-[10px] text-panel-muted">recompensas</div>
          </div>
          <div
            className={`rounded-xl border p-3 text-center transition-colors ${
              stats.manual > 0
                ? 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10'
                : 'border-panel-border bg-panel-soft/60'
            }`}
          >
            <div className="text-xs font-semibold text-panel-muted mb-0.5 flex items-center justify-center gap-1">
              <span>⌨️</span> % Manual
            </div>
            <div
              className={`text-xl font-extrabold ${
                stats.manual > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-panel-text'
              }`}
            >
              {stats.manualPct}%
            </div>
            <div className="text-[10px] text-panel-muted">{stats.manual} ingresos</div>
          </div>
        </div>

        {/* Alcance de datos */}
        <p className="text-[11px] text-panel-muted mb-4 text-center sm:text-left">
          * Indicadores calculados sobre las últimas 50 operaciones registradas para este miembro.
        </p>

        {/* Botones de filtro por tipo de operación */}
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 text-xs" role="tablist" aria-label="Filtro de operaciones">
          <button
            type="button"
            onClick={() => {
              setFilter('ALL');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filter === 'ALL'
                ? 'bg-panel-primary text-white shadow-sm'
                : 'bg-panel-soft text-panel-muted hover:text-panel-text hover:bg-panel-border/60'
            }`}
          >
            Todas ({timeFilteredActivity.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilter('STAMPS');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filter === 'STAMPS'
                ? 'bg-panel-primary text-white shadow-sm'
                : 'bg-panel-soft text-panel-muted hover:text-panel-text hover:bg-panel-border/60'
            }`}
          >
            Sellos ({stats.stampsOps})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilter('REWARDS');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filter === 'REWARDS'
                ? 'bg-panel-primary text-white shadow-sm'
                : 'bg-panel-soft text-panel-muted hover:text-panel-text hover:bg-panel-border/60'
            }`}
          >
            Canjes ({stats.rewards})
          </button>
          {stats.manual > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilter('MANUAL');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filter === 'MANUAL'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              Manuales ({stats.manual})
            </button>
          )}
        </div>

        {renderOperationsList()}
      </>
    );
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-title"
        className={`${WALLET_THEME} bg-panel-surface w-full max-w-2xl max-h-[88vh] rounded-3xl shadow-2xl border border-panel-border flex flex-col overflow-hidden relative motion-safe:animate-[fw-panel-enter_200ms_ease-out]`}
      >
        {/* Cabecera del modal */}
        <div className="p-5 sm:p-6 border-b border-panel-border flex items-start justify-between gap-3 shrink-0 bg-panel-surface">
          <div className="min-w-0 pr-6">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 id="activity-title" className="text-xl font-bold text-panel-text">
                Auditoría de Actividad
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-panel-soft text-panel-muted border border-panel-border">
                {member.role === 'OWNER' ? 'Dueño' : 'Cajero'}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-panel-soft text-panel-muted border border-panel-border">
                Últimas 50 operaciones
              </span>
            </div>
            {displayName ? (
              <>
                <p className="text-base font-bold text-panel-text truncate">{displayName}</p>
                <p className="text-xs font-semibold text-panel-accent truncate">{member.email}</p>
              </>
            ) : (
              <p className="text-sm font-semibold text-panel-accent truncate">{member.email ?? 'Sin correo'}</p>
            )}
            <p className="text-xs text-panel-muted mt-0.5">
              {member.locationName ? `Sucursal: ${member.locationName}` : 'Acceso general'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de actividad"
            className="p-2 text-panel-muted hover:text-panel-text rounded-full hover:bg-panel-soft transition-colors shrink-0"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cuerpo del modal */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {renderModalBody()}
        </div>

        {/* Footer del modal con contador de período y botón de cierre */}
        <div className="p-4 sm:p-5 border-t border-panel-border bg-panel-soft/40 flex items-center justify-between shrink-0">
          <div className="text-xs text-panel-muted">
            <span>
              {timeFilteredActivity.length > 0
                ? `${timeFilteredActivity.length} operaciones ${timeFilter === 'all' ? 'en total' : 'en este período'}`
                : activity.length > 0
                ? `Sin operaciones en este período (${activity.length} en total)`
                : ''}
            </span>
            <span className="block text-[11px] text-panel-muted/80">
              Calculado sobre las últimas 50 operaciones registradas
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-panel-border bg-panel-surface hover:bg-panel-soft text-panel-text font-bold text-xs sm:text-sm transition-colors shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
