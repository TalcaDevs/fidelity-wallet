import type { OverviewReport } from '../../../../services/reportsService';
import { KpiCard } from '../components/KpiCard';
import { DailyEvolutionLineChart } from '../components/DailyEvolutionLineChart';

export interface OverviewTabProps {
  overview: OverviewReport;
  loading?: boolean;
}

export function OverviewTab({ overview, loading = false }: OverviewTabProps) {
  return (
    <div className="space-y-8" data-testid="tab-overview">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard
          title="Clientes Nuevos"
          current={overview.kpis.newCustomers.current}
          previous={overview.kpis.newCustomers.previous}
          changePercentage={overview.kpis.newCustomers.changePercentage}
          loading={loading}
        />
        <KpiCard
          title="Clientes Activos"
          current={overview.kpis.activeCustomers.current}
          previous={overview.kpis.activeCustomers.previous}
          changePercentage={overview.kpis.activeCustomers.changePercentage}
          loading={loading}
        />
        <KpiCard
          title="Sellos Entregados"
          current={overview.kpis.stampsDelivered.current}
          previous={overview.kpis.stampsDelivered.previous}
          changePercentage={overview.kpis.stampsDelivered.changePercentage}
          loading={loading}
        />
        <KpiCard
          title="Premios Canjeados"
          current={overview.kpis.rewardsRedeemed.current}
          previous={overview.kpis.rewardsRedeemed.previous}
          changePercentage={overview.kpis.rewardsRedeemed.changePercentage}
          loading={loading}
        />
        <KpiCard
          title="Tasa de Recurrencia"
          current={overview.kpis.recurrenceRate.current}
          previous={overview.kpis.recurrenceRate.previous}
          changePercentage={overview.kpis.recurrenceRate.changePercentage}
          suffix="%"
          loading={loading}
        />
        <KpiCard
          title="Sellos Vencidos"
          current={overview.kpis.expiredStamps.current}
          previous={overview.kpis.expiredStamps.previous}
          changePercentage={overview.kpis.expiredStamps.changePercentage}
          loading={loading}
        />
      </div>

      {/* Time Series & QR vs Manual Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Evolution Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Evolución Diaria</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tendencia de sellos y canjes entregados día a día
              </p>
            </div>
            <div className="flex items-center gap-5 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white dark:border-slate-800 shadow-sm inline-block" />
                <span className="text-slate-700 dark:text-slate-300">Sellos (Azul)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-white dark:border-slate-800 shadow-sm inline-block" />
                <span className="text-slate-700 dark:text-slate-300">Canjes (Naranja)</span>
              </div>
            </div>
          </div>

          <DailyEvolutionLineChart timeSeries={overview.timeSeries} />
        </div>

        {/* Scan Method Distribution */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Método de Escaneo</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Auditoría de lecturas QR vs. Búsquedas Manuales
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <div className="flex justify-between text-sm font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Código QR</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {overview.methodDistribution.qrPercentage}% ({overview.methodDistribution.qrCount})
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${overview.methodDistribution.qrPercentage}%` }}
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold mb-1">
                  <span className="text-slate-700 dark:text-slate-300">Búsqueda Manual (RUT/Tel)</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {overview.methodDistribution.manualPercentage}% ({overview.methodDistribution.manualCount})
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${overview.methodDistribution.manualPercentage}%` }}
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            💡 <span className="font-semibold text-slate-700 dark:text-slate-200">Recomendación:</span> Si las
            búsquedas manuales superan el 30%, capacita al personal para promover el pase en Apple o Google Wallet.
          </div>
        </div>
      </div>
    </div>
  );
}
