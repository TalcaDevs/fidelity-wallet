import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StaffActivityDto, StaffMemberDto, StaffScanType } from '@fidelity/shared';
import { ErrorAlert } from '../../../../components/ui/ErrorAlert';
import { useAsyncData } from '../../../../hooks/useAsyncData';
import { formatDateTime } from '../../../../lib/formatDate';
import { useDialogFocus } from '../../../../hooks/useDialogFocus';

type FilterType = 'ALL' | 'STAMPS' | 'REWARDS' | 'MANUAL';

const METHOD_CONFIG: Record<
  StaffActivityDto['method'],
  { label: string; badgeClass: string; icon: string }
> = {
  QR: {
    label: 'QR Wallet',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    icon: '📱',
  },
  MANUAL: {
    label: 'Ingreso manual',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    icon: '⌨️',
  },
  PANEL: {
    label: 'Desde el panel',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    icon: '🖥️',
  },
  WELCOME: {
    label: 'Bienvenida',
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    icon: '🎉',
  },
};

const TYPE_CONFIG: Record<
  StaffScanType,
  { label: string; badgeClass: string; icon: string }
> = {
  STAMP_ADDED: {
    label: '+1 Sello entregado',
    badgeClass: 'bg-panel-primary/10 text-panel-primary border-panel-primary/20',
    icon: '🏷️',
  },
  REWARD_REDEEMED: {
    label: 'Premio canjeado',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    icon: '🎁',
  },
};

/**
 * Panel lateral de auditoría de actividad para el dueño del local.
 * Proporciona métricas rápidas (Sellos, Canjes, % Manual), filtro por tipo de operación,
 * detección visual de clientes recurrentes (útil para corroborar alertas antifraude)
 * y distinción clara entre escaneo de tarjeta Wallet y tipeo manual.
 */
export function ActivitySidebar({
  member,
  onClose,
  onLoadActivity,
}: {
  member: StaffMemberDto;
  onClose: () => void;
  onLoadActivity: (userId: string) => Promise<StaffActivityDto[]>;
}) {
  const fetcher = useCallback(() => onLoadActivity(member.userId), [onLoadActivity, member.userId]);
  const { data, loading, error } = useAsyncData(fetcher);
  const activity = data ?? [];
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus(true, dialogRef);

  const [filter, setFilter] = useState<FilterType>('ALL');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Mini-KPIs del historial cargado
  const stats = useMemo(() => {
    const stamps = activity.filter((s) => s.type === 'STAMP_ADDED').length;
    const rewards = activity.filter((s) => s.type === 'REWARD_REDEEMED').length;
    const manual = activity.filter((s) => s.method === 'MANUAL').length;
    const manualPct = activity.length > 0 ? Math.round((manual / activity.length) * 100) : 0;
    return { stamps, rewards, manual, manualPct };
  }, [activity]);

  // Frecuencia por teléfono para detectar clientes recurrentes que coinciden con alertas antifraude
  const customerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const scan of activity) {
      if (scan.customerPhone) {
        counts.set(scan.customerPhone, (counts.get(scan.customerPhone) ?? 0) + 1);
      }
    }
    return counts;
  }, [activity]);

  const filteredActivity = useMemo(() => {
    if (filter === 'STAMPS') return activity.filter((s) => s.type === 'STAMP_ADDED');
    if (filter === 'REWARDS') return activity.filter((s) => s.type === 'REWARD_REDEEMED');
    if (filter === 'MANUAL') return activity.filter((s) => s.method === 'MANUAL');
    return activity;
  }, [activity, filter]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-panel-muted/20 backdrop-blur-sm">
      <aside
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-title"
        className="bg-panel-surface w-full max-w-md h-full shadow-2xl border-l border-panel-border flex flex-col"
      >
        {/* Cabecera de auditoría con datos del miembro */}
        <div className="p-6 border-b border-panel-border flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 id="activity-title" className="text-xl font-bold text-panel-text">
                Auditoría de Actividad
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-panel-soft text-panel-muted border border-panel-border">
                {member.role === 'OWNER' ? 'Dueño' : 'Cajero'}
              </span>
            </div>
            <p className="text-sm font-semibold text-panel-accent truncate">{member.email ?? 'Sin correo'}</p>
            <p className="text-xs text-panel-muted mt-0.5">
              {member.locationName ? `Sucursal: ${member.locationName}` : 'Acceso general'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de actividad"
            className="p-2 text-panel-muted hover:text-panel-text rounded-full hover:bg-panel-soft transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-10" aria-label="Cargando actividad">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-panel-accent" />
            </div>
          ) : error ? (
            <ErrorAlert message={error} />
          ) : activity.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-panel-soft flex items-center justify-center text-2xl mb-3">
                📋
              </div>
              <p className="font-bold text-panel-text text-base">Sin actividad registrada</p>
              <p className="text-sm text-panel-muted mt-1 max-w-xs mx-auto">
                Este miembro del equipo aún no ha registrado escaneos ni canjes en el sistema.
              </p>
            </div>
          ) : (
            <>
              {/* Mini-KPIs superiores */}
              <div className="grid grid-cols-3 gap-2.5 mb-5">
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

              {/* Botones de filtro rápido */}
              <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 text-xs" role="tablist" aria-label="Filtro de operaciones">
                <button
                  type="button"
                  onClick={() => setFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    filter === 'ALL'
                      ? 'bg-panel-primary text-white shadow-sm'
                      : 'bg-panel-soft text-panel-muted hover:text-panel-text hover:bg-panel-border/60'
                  }`}
                >
                  Todas ({activity.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('STAMPS')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    filter === 'STAMPS'
                      ? 'bg-panel-primary text-white shadow-sm'
                      : 'bg-panel-soft text-panel-muted hover:text-panel-text hover:bg-panel-border/60'
                  }`}
                >
                  Sellos ({stats.stamps})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('REWARDS')}
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
                    onClick={() => setFilter('MANUAL')}
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

              {/* Lista de operaciones en formato tarjetas */}
              {filteredActivity.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <p className="font-semibold text-panel-text text-sm">Sin resultados para este filtro</p>
                  <p className="text-xs text-panel-muted mt-1">
                    No se encontraron operaciones de este tipo en el historial reciente.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3" aria-label="Lista de operaciones">
                  {filteredActivity.map((scan) => {
                    const typeInfo = TYPE_CONFIG[scan.type];
                    const methodInfo = METHOD_CONFIG[scan.method];
                    const phone = scan.customerPhone;
                    const visitsCount = phone ? customerCounts.get(phone) ?? 0 : 0;
                    const isHighRecurrence = visitsCount >= 4;

                    return (
                      <li
                        key={scan.id}
                        className={`rounded-2xl border p-4 shadow-sm transition-all ${
                          isHighRecurrence
                            ? 'border-amber-500/40 bg-amber-500/[0.04] dark:bg-amber-500/[0.08]'
                            : 'border-panel-border bg-panel-surface/80 hover:border-panel-border/80'
                        }`}
                      >
                        {/* Cabecera de la operación */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${typeInfo.badgeClass}`}
                          >
                            <span>{typeInfo.icon}</span>
                            <span>{typeInfo.label}</span>
                          </span>
                          <span className="text-xs font-medium text-panel-muted whitespace-nowrap">
                            {formatDateTime(scan.createdAt)}
                          </span>
                        </div>

                        {/* Detalle del cliente y recompensa */}
                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-panel-muted text-xs">Cliente:</span>
                            <span className="font-semibold text-panel-text text-xs tracking-wide">
                              {phone ?? 'Sin teléfono registrado'}
                            </span>
                          </div>

                          {scan.promotionName && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-panel-muted text-xs">Premio:</span>
                              <span className="font-medium text-panel-text text-xs text-right truncate max-w-[200px]">
                                {scan.promotionName}
                              </span>
                            </div>
                          )}

                          {scan.locationName && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-panel-muted text-xs">Sucursal:</span>
                              <span className="text-panel-muted text-xs">{scan.locationName}</span>
                            </div>
                          )}
                        </div>

                        {/* Alerta de recurrencia si tiene 4 o más operaciones (corrobora alerta antifraude) */}
                        {isHighRecurrence && (
                          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                            <span aria-hidden="true">⚠️</span>
                            <span>Cliente frecuente ({visitsCount} visitas en este historial)</span>
                          </div>
                        )}
                        {!isHighRecurrence && visitsCount >= 2 && (
                          <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-panel-muted">
                            <span aria-hidden="true">🔁</span>
                            <span>{visitsCount} visitas en este historial</span>
                          </div>
                        )}

                        {/* Footer con el método de escaneo */}
                        <div className="mt-3 pt-2.5 border-t border-panel-border/60 flex items-center justify-between">
                          <span className="text-[11px] text-panel-muted">Método:</span>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${methodInfo.badgeClass}`}
                          >
                            <span>{methodInfo.icon}</span>
                            <span>{methodInfo.label}</span>
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
