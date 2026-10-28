import { useState, useMemo, useEffect } from 'react';
import type { RetentionReport } from '../../../../services/reportsService';

const DORMANT_PAGE_SIZE = 10;

export interface RetentionTabProps {
  retention: RetentionReport;
  dormantDays: number;
  onDormantDaysChange: (days: number) => void;
}

export function RetentionTab({
  retention,
  dormantDays,
  onDormantDaysChange,
}: RetentionTabProps) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [dormantDays]);

  const totalDormantPages = Math.max(1, Math.ceil(retention.dormantCustomers.customers.length / DORMANT_PAGE_SIZE));

  useEffect(() => {
    if (page > totalDormantPages) {
      setPage(totalDormantPages);
    }
  }, [page, totalDormantPages]);

  const pagedDormant = useMemo(() => {
    const startIndex = (page - 1) * DORMANT_PAGE_SIZE;
    return retention.dormantCustomers.customers.slice(startIndex, startIndex + DORMANT_PAGE_SIZE);
  }, [retention.dormantCustomers.customers, page]);

  return (
    <div className="space-y-6 sm:space-y-8" data-testid="tab-retention">
      {/* Frequency & Weekly grid */}
      <div data-panel-stagger className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Visit Frequency */}
        <div data-panel-reveal className="bg-panel-surface p-4 sm:p-6 lg:p-8 rounded-2xl border border-panel-border shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <h3 className="text-xl font-bold text-panel-text">Frecuencia de Visitas</h3>
            <span
              className="relative group/tooltip inline-flex items-center cursor-help shrink-0"
              tabIndex={0}
              aria-label="Cantidad de visitas realizadas por tus clientes en el período seleccionado"
              title="Cantidad de visitas realizadas por tus clientes en el período seleccionado"
            >
              <svg className="w-4 h-4 text-panel-muted/80 hover:text-panel-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block group-focus/tooltip:block z-30 w-56 rounded-xl bg-gray-900 dark:bg-neutral-800 p-2.5 text-center text-xs font-normal text-white shadow-xl border border-white/10 leading-snug">
                Cantidad de visitas realizadas por tus clientes en las fechas elegidas.
              </span>
            </span>
          </div>
          <p className="text-xs text-panel-muted mb-6">
            Segmentación de clientes según visitas en el período
          </p>

          <div className="space-y-4">
            {retention.visitFrequencyDistribution.map((item) => (
              <div key={item.range}>
                <div className="flex justify-between text-sm font-semibold mb-1">
                  <span className="text-panel-text">{item.range}</span>
                  <span className="text-panel-text font-bold">
                    {item.customerCount} clientes ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-panel-soft rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.percentage}%` }}
                    className="h-full bg-panel-primary rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Retention */}
        <div data-panel-reveal className="bg-panel-surface p-4 sm:p-6 lg:p-8 rounded-2xl border border-panel-border shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <h3 className="text-xl font-bold text-panel-text">Retención Mes a Mes</h3>
            <span
              className="relative group/tooltip inline-flex items-center cursor-help shrink-0"
              tabIndex={0}
              aria-label="Porcentaje de clientes nuevos que siguen volviendo en los meses posteriores a su primera visita"
              title="Porcentaje de clientes nuevos que siguen volviendo en los meses posteriores a su primera visita"
            >
              <svg className="w-4 h-4 text-panel-muted/80 hover:text-panel-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block group-focus/tooltip:block z-30 w-60 rounded-xl bg-gray-900 dark:bg-neutral-800 p-2.5 text-center text-xs font-normal text-white shadow-xl border border-white/10 leading-snug">
                Porcentaje de clientes que siguen volviendo a tu local en los meses posteriores a su primera visita.
              </span>
            </span>
          </div>
          <p className="text-xs text-panel-muted mb-6">
            Porcentaje de clientes que siguen volviendo a tu local en los meses siguientes
          </p>

          {retention.cohorts.length === 0 ? (
            <p className="text-sm text-panel-muted">Aún no hay suficiente historial para calcular la retención por meses.</p>
          ) : (
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-panel-border text-panel-muted">
                    <th className="pb-3 font-semibold">Mes de ingreso</th>
                    <th className="pb-3 font-semibold text-center">Nuevos</th>
                    <th className="pb-3 font-semibold text-center">Mes 1</th>
                    <th className="pb-3 font-semibold text-center">Mes 2</th>
                    <th className="pb-3 font-semibold text-center">Mes 3</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel-border">
                  {retention.cohorts.map((cohort) => (
                    <tr key={cohort.cohortMonth}>
                      <td className="py-3 font-bold text-panel-text">{cohort.cohortMonth}</td>
                      <td className="py-3 text-center text-panel-muted">
                        {cohort.totalNewCustomers}
                      </td>
                      <td className="py-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                        {cohort.month1ReturnRate}%
                      </td>
                      <td className="py-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                        {cohort.month2ReturnRate}%
                      </td>
                      <td className="py-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                        {cohort.month3ReturnRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dormant Customers */}
      <div data-panel-reveal className="bg-panel-surface p-4 sm:p-6 lg:p-8 rounded-2xl border border-panel-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-panel-text">Clientes Dormidos</h3>
            <p className="text-xs text-panel-muted">
              {retention.dormantCustomers.count} clientes no han visitado el local hace más de {dormantDays} días.
            </p>
          </div>

          {/* Threshold filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-panel-muted">Umbral de inactividad:</span>
            <select
              value={dormantDays}
              onChange={(e) => onDormantDaysChange(Number(e.target.value))}
              aria-label="Seleccionar umbral de inactividad en días"
              className="text-xs font-bold bg-panel-soft text-panel-text border-none rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-panel-accent cursor-pointer"
            >
              <option value={15}>15 días</option>
              <option value={30}>30 días</option>
              <option value={60}>60 días</option>
              <option value={90}>90 días</option>
            </select>
          </div>
        </div>

        {retention.dormantCustomers.customers.length === 0 ? (
          <p className="text-sm text-panel-muted py-6 text-center">¡Excelente! No hay clientes dormidos con este umbral.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-panel-border text-panel-muted">
                    <th className="pb-3 font-semibold">Identificador</th>
                    <th className="pb-3 font-semibold">Última Visita</th>
                    <th className="pb-3 font-semibold text-right">Días Inactivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel-border">
                  {pagedDormant.map((c) => (
                    <tr key={c.customerId}>
                      <td className="py-3 font-mono font-medium text-panel-text">
                        {c.maskedIdentifier}
                      </td>
                      <td className="py-3 text-panel-muted">
                        {c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString('es-CL') : 'N/A'}
                      </td>
                      <td className="py-3 text-right font-bold text-rose-500">{c.daysInactive} días</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pasar página (Paginación) en Clientes Dormidos */}
            {totalDormantPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-panel-border/60 mt-3">
                <p className="text-xs text-panel-muted font-medium text-center sm:text-left">
                  Mostrando <span className="font-semibold text-panel-text">{(page - 1) * DORMANT_PAGE_SIZE + 1} - {Math.min(page * DORMANT_PAGE_SIZE, retention.dormantCustomers.customers.length)}</span> de <span className="font-semibold text-panel-text">{retention.dormantCustomers.customers.length}</span> clientes dormidos
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior de clientes dormidos"
                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-panel-border bg-panel-surface text-panel-text hover:bg-panel-soft disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1 shadow-2xs"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Anterior</span>
                  </button>
                  <span className="text-xs font-semibold text-panel-muted px-2">
                    Página <strong className="text-panel-text">{page}</strong> de <strong className="text-panel-text">{totalDormantPages}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalDormantPages}
                    onClick={() => setPage((p) => Math.min(totalDormantPages, p + 1))}
                    aria-label="Página siguiente de clientes dormidos"
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
          </>
        )}
      </div>
    </div>
  );
}
