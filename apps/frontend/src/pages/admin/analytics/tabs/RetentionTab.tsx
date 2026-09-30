import type { RetentionReport } from '../../../../services/reportsService';

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
  return (
    <div className="space-y-8" data-testid="tab-retention">
      {/* Frequency & Weekly grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Visit Frequency */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Frecuencia de Visitas</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Segmentación de clientes según visitas en el período
          </p>

          <div className="space-y-4">
            {retention.visitFrequencyDistribution.map((item) => (
              <div key={item.range}>
                <div className="flex justify-between text-sm font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">{item.range}</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {item.customerCount} clientes ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.percentage}%` }}
                    className="h-full bg-brand-blue rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Cohorts */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Cohortes de Retención Mensual</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            % de clientes nuevos que siguen activos en meses posteriores
          </p>

          {retention.cohorts.length === 0 ? (
            <p className="text-sm text-slate-400">Insuficiente historial para análisis de cohortes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400">
                    <th className="pb-3 font-semibold">Cohorte</th>
                    <th className="pb-3 font-semibold text-center">Nuevos</th>
                    <th className="pb-3 font-semibold text-center">Mes 1</th>
                    <th className="pb-3 font-semibold text-center">Mes 2</th>
                    <th className="pb-3 font-semibold text-center">Mes 3</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {retention.cohorts.map((cohort) => (
                    <tr key={cohort.cohortMonth}>
                      <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{cohort.cohortMonth}</td>
                      <td className="py-3 text-center text-slate-600 dark:text-slate-400">
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
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Clientes Dormidos</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {retention.dormantCustomers.count} clientes no han visitado el local hace más de {dormantDays} días.
            </p>
          </div>

          {/* Threshold filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Umbral de inactividad:</span>
            <select
              value={dormantDays}
              onChange={(e) => onDormantDaysChange(Number(e.target.value))}
              aria-label="Seleccionar umbral de inactividad en días"
              className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-none rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-brand-blue cursor-pointer"
            >
              <option value={15}>15 días</option>
              <option value={30}>30 días</option>
              <option value={60}>60 días</option>
              <option value={90}>90 días</option>
            </select>
          </div>
        </div>

        {retention.dormantCustomers.customers.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">¡Excelente! No hay clientes dormidos con este umbral.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400">
                  <th className="pb-3 font-semibold">Identificador</th>
                  <th className="pb-3 font-semibold">Última Visita</th>
                  <th className="pb-3 font-semibold text-right">Días Inactivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {retention.dormantCustomers.customers.map((c) => (
                  <tr key={c.customerId}>
                    <td className="py-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {c.maskedIdentifier}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">
                      {c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString('es-CL') : 'N/A'}
                    </td>
                    <td className="py-3 text-right font-bold text-rose-500">{c.daysInactive} días</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
