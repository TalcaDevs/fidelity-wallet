import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  fetchOverviewReport,
  fetchRetentionReport,
  fetchPromotionsReport,
  fetchStaffActivityReport,
  type OverviewReport,
  type RetentionReport,
  type PromotionPerformanceReport,
  type StaffActivityReport,
} from '../../services/reportsService';
import { AnalyticsSkeleton, type TabType } from './analytics/components/AnalyticsSkeleton';
import { OverviewTab } from './analytics/tabs/OverviewTab';
import { RetentionTab } from './analytics/tabs/RetentionTab';
import { PromotionsTab } from './analytics/tabs/PromotionsTab';
import { StaffTab } from './analytics/tabs/StaffTab';
import {
  computeDateRange,
  getClientTimeZone,
  type PeriodPreset,
} from './analytics/utils/dateUtils';

export interface AnalyticsProps {
  merchantId: string | null;
  brandId?: string | null;
  locationId?: string | null;
}

export function Analytics({ merchantId, brandId, locationId }: AnalyticsProps) {
  // brandId y locationId preparados para la evolución multi-local tras PR #16
  const targetId = merchantId || brandId || locationId || null;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30d');
  const [dormantDays, setDormantDays] = useState<number>(30);
  const [retryCounter, setRetryCounter] = useState<number>(0);

  // Rango de fechas local sin desfase de medianoche UTC
  const dateRange = useMemo(() => computeDateRange(periodPreset), [periodPreset]);
  const timeZone = useMemo(() => getClientTimeZone(), []);

  // Estados de datos independientes para evitar fallos en cascada
  const [overview, setOverview] = useState<OverviewReport | null>(null);
  const [retention, setRetention] = useState<RetentionReport | null>(null);
  const [promotions, setPromotions] = useState<PromotionPerformanceReport | null>(null);
  const [staff, setStaff] = useState<StaffActivityReport | null>(null);

  // Estados de carga granulares
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [loadingRetention, setLoadingRetention] = useState<boolean>(true);
  const [loadingPromotions, setLoadingPromotions] = useState<boolean>(true);
  const [loadingStaff, setLoadingStaff] = useState<boolean>(true);

  // Errores granulares por dominio
  const [errorOverview, setErrorOverview] = useState<string | null>(null);
  const [errorRetention, setErrorRetention] = useState<string | null>(null);
  const [errorPromotions, setErrorPromotions] = useState<string | null>(null);
  const [errorStaff, setErrorStaff] = useState<string | null>(null);

  const handleRetry = useCallback(() => {
    setRetryCounter((prev) => prev + 1);
  }, []);

  // Carga de reportes vinculados a dateRange (Overview, Promotions, Staff)
  useEffect(() => {
    if (!targetId) return;

    let isMounted = true;
    setLoadingOverview(true);
    setLoadingPromotions(true);
    setLoadingStaff(true);
    setErrorOverview(null);
    setErrorPromotions(null);
    setErrorStaff(null);

    const queryParams = {
      from: dateRange.from,
      to: dateRange.to,
      tz: timeZone,
    };

    Promise.allSettled([
      fetchOverviewReport(targetId, queryParams),
      fetchPromotionsReport(targetId, queryParams),
      fetchStaffActivityReport(targetId, queryParams),
    ]).then(([resOverview, resPromotions, resStaff]) => {
      if (!isMounted) return;

      // Overview
      if (resOverview.status === 'fulfilled') {
        setOverview(resOverview.value);
        setErrorOverview(null);
      } else {
        setErrorOverview(resOverview.reason?.message || 'Error al obtener el reporte general');
      }
      setLoadingOverview(false);

      // Promotions
      if (resPromotions.status === 'fulfilled') {
        setPromotions(resPromotions.value);
        setErrorPromotions(null);
      } else {
        setErrorPromotions(resPromotions.reason?.message || 'Error al obtener el reporte de promociones');
      }
      setLoadingPromotions(false);

      // Staff
      if (resStaff.status === 'fulfilled') {
        setStaff(resStaff.value);
        setErrorStaff(null);
      } else {
        setErrorStaff(resStaff.reason?.message || 'Error al obtener el reporte de personal');
      }
      setLoadingStaff(false);
    });

    return () => {
      isMounted = false;
    };
  }, [targetId, dateRange, timeZone, retryCounter]);

  // Carga desacoplada de Retention (reacciona independientemente a dormantDays)
  useEffect(() => {
    if (!targetId) return;

    let isMounted = true;
    setLoadingRetention(true);
    setErrorRetention(null);

    fetchRetentionReport(targetId, { dormantDays, tz: timeZone })
      .then((data) => {
        if (!isMounted) return;
        setRetention(data);
        setErrorRetention(null);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Error al obtener el reporte de retención';
        setErrorRetention(msg);
      })
      .finally(() => {
        if (isMounted) setLoadingRetention(false);
      });

    return () => {
      isMounted = false;
    };
  }, [targetId, dormantDays, timeZone, retryCounter]);

  // Seguimiento de carga inicial completada
  const [hasInitialLoaded, setHasInitialLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (!loadingOverview && !loadingRetention && !loadingPromotions && !loadingStaff) {
      setHasInitialLoaded(true);
    }
  }, [loadingOverview, loadingRetention, loadingPromotions, loadingStaff]);

  // Determinación de carga: durante la carga inicial o durante el refresco de la pestaña activa
  const isTabLoading = useMemo(() => {
    if (!hasInitialLoaded) {
      return loadingOverview || loadingRetention || loadingPromotions || loadingStaff;
    }
    switch (activeTab) {
      case 'overview':
        return loadingOverview;
      case 'retention':
        return loadingRetention;
      case 'promotions':
        return loadingPromotions;
      case 'staff':
        return loadingStaff;
    }
  }, [hasInitialLoaded, activeTab, loadingOverview, loadingRetention, loadingPromotions, loadingStaff]);

  const activeTabError = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return errorOverview;
      case 'retention':
        return errorRetention;
      case 'promotions':
        return errorPromotions;
      case 'staff':
        return errorStaff;
    }
  }, [activeTab, errorOverview, errorRetention, errorPromotions, errorStaff]);

  if (!targetId) {
    return (
      <div className="p-8 text-center text-slate-500">
        No se ha seleccionado ningún comercio asociado.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header & Date Preset Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Analítica y Reportes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Métricas de fidelización, retención de clientes y desempeño operativo
          </p>
        </div>

        {/* Date presets */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl self-start sm:self-auto border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setPeriodPreset('7d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodPreset === '7d'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            onClick={() => setPeriodPreset('30d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodPreset === '30d'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Últimos 30 días
          </button>
          <button
            type="button"
            onClick={() => setPeriodPreset('this_month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              periodPreset === 'this_month'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Este mes
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-brand-blue text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Resumen General
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('retention')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'retention'
              ? 'bg-brand-blue text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Retención y Clientes Dormidos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('promotions')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'promotions'
              ? 'bg-brand-blue text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Rendimiento de Promociones
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'staff'
              ? 'bg-brand-blue text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Actividad de Equipo
        </button>
      </div>

      {/* Error Banner con botón de reintento */}
      {activeTabError && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold mb-1">Error al cargar analítica</h3>
            <p className="text-sm">{activeTabError}</p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm self-start sm:self-center cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Skeleton while loading */}
      {isTabLoading && !activeTabError && <AnalyticsSkeleton activeTab={activeTab} />}

      {/* Tab Contents */}
      {!isTabLoading && !activeTabError && (
        <>
          {activeTab === 'overview' && overview && <OverviewTab overview={overview} />}

          {activeTab === 'retention' && retention && (
            <RetentionTab
              retention={retention}
              dormantDays={dormantDays}
              onDormantDaysChange={setDormantDays}
            />
          )}

          {activeTab === 'promotions' && promotions && (
            <PromotionsTab promotions={promotions} />
          )}

          {activeTab === 'staff' && staff && <StaffTab staff={staff} />}
        </>
      )}
    </div>
  );
}
