import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { StaffActivityDto, StaffMemberDto, StaffScanType } from '@fidelity/shared';
import { customerDetailPath } from '../../../../components/routing/routePaths';
import { ErrorAlert } from '../../../../components/ui/ErrorAlert';
import { WALLET_THEME } from '../../../../components/ui/walletTheme';
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
 * Modal de auditoría de actividad del personal para el dueño del local.
 * Renderizado vía portal en document.body con soporte completo de modo oscuro (WALLET_THEME),
 * estados de carga skeleton, filtros rápidos de operaciones y navegación al historial de compras del cliente.
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
  const navigate = useNavigate();
  const fetcher = useCallback(() => onLoadActivity(member.userId), [onLoadActivity, member.userId]);
  const { data, loading, error } = useAsyncData(fetcher);
  const activity = data ?? [];
  const dialogRef = useRef<HTMLDivElement>(null);
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

  const handleNavigateToCustomer = (customerId: string | null | undefined) => {
    if (!customerId) return;
    onClose();
    navigate(customerDetailPath(customerId));
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
      onClick={(e) => {
        // Cierra al hacer clic en el fondo oscuro exterior
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
            <div className="flex items-center gap-2 mb-1">
              <h2 id="activity-title" className="text-xl font-bold text-panel-text">
                Auditoría de Actividad
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-panel-soft text-panel-muted border border-panel-border">
                {member.role === 'OWNER' ? 'Dueño' : 'Cajero'}
              </span>
            </div>
            {([member.firstName, member.lastName].filter(Boolean).join(' ').trim() || member.name) ? (
              <>
                <p className="text-base font-bold text-panel-text truncate">
                  {[member.firstName, member.lastName].filter(Boolean).join(' ').trim() || member.name}
                </p>
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
          {loading ? (
            /* Skeleton Loading State: reproduce la estructura real de la interfaz */
            <div className="space-y-5 animate-pulse" aria-label="Cargando actividad">
              {/* Skeleton Mini-KPIs */}
              <div className="grid grid-cols-3 gap-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-panel-soft border border-panel-border/60" />
                ))}
              </div>

              {/* Skeleton Filtros rápidos */}
              <div className="flex gap-2">
                <div className="h-7 w-20 bg-panel-soft rounded-lg" />
                <div className="h-7 w-20 bg-panel-soft rounded-lg" />
                <div className="h-7 w-20 bg-panel-soft rounded-lg" />
              </div>

              {/* Skeleton Tarjetas de Operación */}
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl border border-panel-border/60 bg-panel-soft/30 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="h-5 w-32 bg-panel-soft rounded-lg" />
                      <div className="h-4 w-24 bg-panel-soft rounded-md" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-48 bg-panel-soft rounded-md" />
                      <div className="h-4 w-36 bg-panel-soft rounded-md" />
                    </div>
                    <div className="pt-2.5 border-t border-panel-border/40 flex justify-between items-center">
                      <div className="h-4 w-24 bg-panel-soft rounded-md" />
                      <div className="h-4 w-24 bg-panel-soft rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
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

              {/* Lista de operaciones en formato tarjetas interactivas */}
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
                    const hasCustomerLink = Boolean(scan.customerId);

                    return (
                      <li
                        key={scan.id}
                        role={hasCustomerLink ? 'button' : undefined}
                        tabIndex={hasCustomerLink ? 0 : undefined}
                        onClick={hasCustomerLink ? () => handleNavigateToCustomer(scan.customerId) : undefined}
                        onKeyDown={
                          hasCustomerLink
                            ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleNavigateToCustomer(scan.customerId);
                                }
                              }
                            : undefined
                        }
                        title={hasCustomerLink ? 'Clic para ver ficha e historial de compras de este cliente' : undefined}
                        className={`group rounded-2xl border p-4 shadow-sm transition-all text-left ${
                          hasCustomerLink ? 'cursor-pointer hover:border-panel-accent hover:shadow-md' : ''
                        } ${
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

                        {/* Footer con el método de escaneo y enlace a compras */}
                        <div className="mt-3 pt-2.5 border-t border-panel-border/60 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-panel-muted">Método:</span>
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${methodInfo.badgeClass}`}
                            >
                              <span>{methodInfo.icon}</span>
                              <span>{methodInfo.label}</span>
                            </span>
                          </div>
                          {hasCustomerLink && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-panel-accent group-hover:underline">
                              <span>Ver compras</span>
                              <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Footer del modal con botón de cierre */}
        <div className="p-4 sm:p-5 border-t border-panel-border bg-panel-soft/40 flex items-center justify-between shrink-0">
          <p className="text-xs text-panel-muted">
            {activity.length > 0 ? `${activity.length} operaciones registradas` : ''}
          </p>
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
