import type { StaffActivityReport } from '../../../../services/reportsService';

export interface StaffTabProps {
  staff: StaffActivityReport;
}

export function StaffTab({ staff }: StaffTabProps) {
  const allAlerts = staff.staff.flatMap((s) => s.alerts);

  const severityLabel: Record<string, string> = {
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
  };

  return (
    <div className="space-y-8" data-testid="tab-staff">
      {/* Antifraud Alerts Overview */}
      {allAlerts.length === 0 ? (
        <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xl">
            ✓
          </div>
          <div>
            <h4 className="font-bold text-emerald-900 dark:text-emerald-200">Sin anomalías detectadas</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              No se detectaron patrones sospechosos de escaneo en el equipo para el período seleccionado.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center">
              ⚠️
            </span>
            <div>
              <h4 className="font-bold text-amber-950 dark:text-amber-200">
                Observaciones Operativas y Antifraude del Equipo ({allAlerts.length})
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-400">
                Señales de advertencia preventivas basadas en las heurísticas de seguridad del programa.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {allAlerts.map((alert, idx) => (
              <div
                key={idx}
                className="p-3 bg-panel-surface rounded-xl border border-amber-200/60 dark:border-amber-700/60 flex items-center justify-between text-xs"
              >
                <span className="text-panel-text font-medium">{alert.description}</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                    alert.severity === 'high'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                      : alert.severity === 'medium'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  }`}
                >
                  Severidad {severityLabel[alert.severity] || alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Members Table */}
      <div data-panel-reveal className="bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm">
        <h3 className="text-xl font-bold text-panel-text mb-2">Actividad de Equipo</h3>
        <p className="text-xs text-panel-muted mb-6">
          Desglose de sellos, canjes y proporción de uso de búsqueda manual por miembro del equipo.
        </p>

        {staff.staff.length === 0 ? (
          <p className="text-sm text-panel-muted py-6 text-center">
            No hay actividad de miembros del equipo registrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-panel-border text-panel-muted text-xs">
                  <th className="pb-3 font-semibold">Miembro del Equipo</th>
                  <th className="pb-3 font-semibold text-center">Rol</th>
                  <th className="pb-3 font-semibold text-center">Sellos Otorgados</th>
                  <th className="pb-3 font-semibold text-center">Canjes Procesados</th>
                  <th className="pb-3 font-semibold text-center">% Búsqueda Manual</th>
                  <th className="pb-3 font-semibold text-right">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-border">
                {staff.staff.map((m) => (
                  <tr key={m.userId}>
                    <td className="py-4">
                      <span className="font-semibold text-panel-text block">
                        {m.staffName || `Miembro ${m.userId.slice(0, 8)}`}
                      </span>
                      <span className="text-[11px] font-mono text-panel-muted">{m.userId}</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-panel-soft text-panel-muted">
                        {m.role}
                      </span>
                    </td>
                    <td className="py-4 text-center font-bold text-panel-text">
                      {m.stampsCount}
                    </td>
                    <td className="py-4 text-center font-bold text-panel-text">
                      {m.redeemsCount}
                    </td>
                    <td className="py-4 text-center">
                      <span
                        className={`font-semibold ${
                          m.manualPercentage > 50
                            ? 'text-rose-500 font-bold'
                            : 'text-panel-text '
                        }`}
                      >
                        {m.manualPercentage}%
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      {m.alerts.length > 0 ? (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                          {m.alerts.length} alerta{m.alerts.length > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-panel-muted">Normal</span>
                      )}
                    </td>
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
