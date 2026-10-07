import type { OverviewReport } from '../../../../services/reportsService';
import { KpiCard } from '../components/KpiCard';
import { DailyEvolutionLineChart } from '../components/DailyEvolutionLineChart';

export interface OverviewTabProps {
  overview: OverviewReport;
}

export function OverviewTab({ overview }: OverviewTabProps) {
  return (
    <div className="space-y-8" data-testid="tab-overview">
      {/* KPI Cards Grid */}
      <div data-panel-stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard
          title="Clientes Nuevos"
          current={overview.kpis.newCustomers.current}
          previous={overview.kpis.newCustomers.previous}
          changePercentage={overview.kpis.newCustomers.changePercentage}
        />
        <KpiCard
          title="Clientes Activos"
          current={overview.kpis.activeCustomers.current}
          previous={overview.kpis.activeCustomers.previous}
          changePercentage={overview.kpis.activeCustomers.changePercentage}
        />
        <KpiCard
          title="Cargas Registradas"
          current={overview.kpis.stampsDelivered.current}
          previous={overview.kpis.stampsDelivered.previous}
          changePercentage={overview.kpis.stampsDelivered.changePercentage}
        />
        <KpiCard
          title="Premios Canjeados"
          current={overview.kpis.rewardsRedeemed.current}
          previous={overview.kpis.rewardsRedeemed.previous}
          changePercentage={overview.kpis.rewardsRedeemed.changePercentage}
        />
        <KpiCard
          title="Tasa de Recurrencia"
          current={overview.kpis.recurrenceRate.current}
          previous={overview.kpis.recurrenceRate.previous}
          changePercentage={overview.kpis.recurrenceRate.changePercentage}
          suffix="%"
        />
        <KpiCard
          title="Sellos Vencidos"
          current={overview.kpis.expiredStamps.current}
          previous={overview.kpis.expiredStamps.previous}
          changePercentage={overview.kpis.expiredStamps.changePercentage}
        />
      </div>

      {/* Time Series & QR vs Manual Cards */}
      <div data-panel-stagger className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Daily Evolution Chart */}
        <div className="lg:col-span-2 bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-panel-text">Evolución Diaria</h3>
              <p className="text-xs text-panel-muted">
                Tendencia de cargas y canjes registrados día a día
              </p>
            </div>
            <div className="flex items-center gap-5 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-panel-accent border-2 border-white shadow-sm inline-block" />
                <span className="text-panel-text">Cargas (Azul)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-panel-orange border-2 border-white shadow-sm inline-block" />
                <span className="text-panel-text">Canjes (Naranja)</span>
              </div>
            </div>
          </div>

          <DailyEvolutionLineChart timeSeries={overview.timeSeries} />
        </div>

        {/* Scan Method Distribution */}
        <div data-panel-reveal className="bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-panel-text mb-2">Método de Escaneo</h3>
            <p className="text-xs text-panel-muted mb-6">
              Auditoría de lecturas QR vs. Búsquedas Manuales
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <div className="flex justify-between text-sm font-semibold mb-1">
                  <span className="text-panel-text">Código QR</span>
                  <span className="text-panel-text font-bold">
                    {overview.methodDistribution.qrPercentage}% ({overview.methodDistribution.qrCount})
                  </span>
                </div>
                <div className="w-full h-3 bg-panel-soft rounded-full overflow-hidden">
                  <div
                    style={{ width: `${overview.methodDistribution.qrPercentage}%` }}
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold mb-1">
                  <span className="text-panel-text">Búsqueda Manual (RUT/Tel)</span>
                  <span className="text-panel-text font-bold">
                    {overview.methodDistribution.manualPercentage}% ({overview.methodDistribution.manualCount})
                  </span>
                </div>
                <div className="w-full h-3 bg-panel-soft rounded-full overflow-hidden">
                  <div
                    style={{ width: `${overview.methodDistribution.manualPercentage}%` }}
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-panel-soft border border-panel-border text-xs text-panel-muted">
            💡 <span className="font-semibold text-panel-text">Recomendación:</span> Si las
            búsquedas manuales superan el 30%, capacita al personal para promover el pase en Apple o Google Wallet.
          </div>
        </div>
      </div>
    </div>
  );
}
