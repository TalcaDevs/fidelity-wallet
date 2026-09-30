import type { PromotionPerformanceReport } from '../../../../services/reportsService';

export interface PromotionsTabProps {
  promotions: PromotionPerformanceReport;
}

export function PromotionsTab({ promotions }: PromotionsTabProps) {
  return (
    <div className="space-y-8" data-testid="tab-promotions">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Rendimiento por Promoción</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Monitoreo de canjes, tiempo promedio hasta completar el pase y sellos vencidos sin utilizar (breakage).
        </p>

        {promotions.promotions.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">No hay promociones configuradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                  <th className="pb-3 font-semibold">Promoción</th>
                  <th className="pb-3 font-semibold text-center">Objetivo</th>
                  <th className="pb-3 font-semibold text-center">Canjes</th>
                  <th className="pb-3 font-semibold text-center">Días Promedio para Canjear</th>
                  <th className="pb-3 font-semibold text-center">Sellos Vencidos (Breakage)</th>
                  <th className="pb-3 font-semibold text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {promotions.promotions.map((p) => (
                  <tr key={p.id}>
                    <td className="py-4">
                      <span className="font-bold text-slate-900 dark:text-white block">{p.name}</span>
                      <span className="text-xs text-slate-400">Premio: {p.rewardName}</span>
                    </td>
                    <td className="py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      {p.targetStamps} sellos
                    </td>
                    <td className="py-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      {p.redeemedCount}
                    </td>
                    <td className="py-4 text-center font-medium text-slate-600 dark:text-slate-300">
                      {p.averageDaysToRedeem !== null ? `${p.averageDaysToRedeem} días` : 'N/A'}
                    </td>
                    <td className="py-4 text-center font-medium text-rose-500">{p.breakageCount}</td>
                    <td className="py-4 text-right">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                          p.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                        }`}
                      >
                        {p.isActive ? 'Activa' : 'Pausada'}
                      </span>
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
