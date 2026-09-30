import { useEffect, useState, useMemo } from 'react';
import {
  fetchOverviewReport,
  fetchRetentionReport,
  fetchPromotionsReport,
  fetchStaffActivityReport,
  type OverviewReport,
  type RetentionReport,
  type PromotionPerformanceReport,
  type StaffActivityReport,
  type TimeSeriesPoint,
} from '../../services/reportsService';

interface AnalyticsProps {
  merchantId: string | null;
}

type TabType = 'overview' | 'retention' | 'promotions' | 'staff';
type PeriodPreset = '7d' | '30d' | 'this_month';

function formatChange(change: number | null): { text: string; positive: boolean; neutral: boolean } {
  if (change === null) return { text: 'N/A', positive: true, neutral: true };
  if (change === 0) return { text: '0%', positive: true, neutral: true };
  const sign = change > 0 ? '+' : '';
  return {
    text: `${sign}${change}%`,
    positive: change > 0,
    neutral: false,
  };
}

function KpiCard({
  title,
  current,
  previous,
  changePercentage,
  suffix = '',
  loading = false,
}: {
  title: string;
  current: number;
  previous: number;
  changePercentage: number | null;
  suffix?: string;
  loading?: boolean;
}) {
  const change = formatChange(changePercentage);

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm relative overflow-hidden">
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">{title}</p>
      {loading ? (
        <div className="h-10 w-28 bg-slate-100 dark:bg-slate-700 animate-pulse rounded-xl mb-3" />
      ) : (
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {current.toLocaleString('es-CL')}
            {suffix}
          </span>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-bold ${
              change.neutral
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                : change.positive
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {change.text}
          </span>
        </div>
      )}
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Período anterior: <span className="font-medium text-slate-600 dark:text-slate-300">{previous.toLocaleString('es-CL')}{suffix}</span>
      </p>
    </div>
  );
}

function DailyEvolutionLineChart({ timeSeries }: { timeSeries: TimeSeriesPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!timeSeries || timeSeries.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        Sin datos registrados para el período seleccionado
      </div>
    );
  }

  const svgWidth = 720;
  const svgHeight = 280;
  const paddingLeft = 60;
  const paddingRight = 35;
  const paddingTop = 35;
  const paddingBottom = 45;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const maxVal = Math.max(...timeSeries.map((p) => Math.max(p.stamps, p.rewards)), 1);
  const maxY = maxVal <= 5 ? 5 : maxVal <= 10 ? 10 : Math.ceil(maxVal / 5) * 5;

  const n = timeSeries.length;
  const getX = (idx: number) =>
    n === 1 ? paddingLeft + plotWidth / 2 : paddingLeft + (idx / (n - 1)) * plotWidth;
  const getY = (val: number) =>
    paddingTop + plotHeight - (Math.min(val, maxY) / maxY) * plotHeight;

  // Path data for blue line (sellos)
  const stampsPath = timeSeries
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.stamps).toFixed(1)}`)
    .join(' ');

  // Path data for orange line (canjes)
  const rewardsPath = timeSeries
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.rewards).toFixed(1)}`)
    .join(' ');

  // Gradient area paths
  const stampsAreaPath =
    n > 1
      ? `${stampsPath} L ${getX(n - 1).toFixed(1)} ${(paddingTop + plotHeight).toFixed(1)} L ${getX(0).toFixed(1)} ${(paddingTop + plotHeight).toFixed(1)} Z`
      : '';

  const rewardsAreaPath =
    n > 1
      ? `${rewardsPath} L ${getX(n - 1).toFixed(1)} ${(paddingTop + plotHeight).toFixed(1)} L ${getX(0).toFixed(1)} ${(paddingTop + plotHeight).toFixed(1)} Z`
      : '';

  // 4 Y-axis ticks
  const yTicks = [
    0,
    Math.round(maxY / 3),
    Math.round((maxY * 2) / 3),
    maxY,
  ];

  // X-axis tick step to avoid crowded labels
  const xTickStep = Math.max(1, Math.ceil(n / 8));

  const hoveredPoint = hoveredIndex !== null ? timeSeries[hoveredIndex] : null;

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto select-none"
      >
        <defs>
          <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Eje Y Label: Cantidad */}
        <text
          x={paddingLeft - 10}
          y={paddingTop - 14}
          textAnchor="start"
          className="text-[11px] font-bold fill-slate-500 dark:fill-slate-400"
        >
          Cantidad
        </text>

        {/* Eje X Label: Días */}
        <text
          x={svgWidth - paddingRight}
          y={svgHeight - 8}
          textAnchor="end"
          className="text-[11px] font-bold fill-slate-500 dark:fill-slate-400"
        >
          Días
        </text>

        {/* Y-axis gridlines and numeric values */}
        {yTicks.map((val) => {
          const yPos = getY(val);
          return (
            <g key={val}>
              <line
                x1={paddingLeft}
                y1={yPos}
                x2={paddingLeft + plotWidth}
                y2={yPos}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 12}
                y={yPos + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 dark:fill-slate-500 font-medium"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Eje X (Línea Horizontal) */}
        <line
          x1={paddingLeft}
          y1={paddingTop + plotHeight}
          x2={paddingLeft + plotWidth}
          y2={paddingTop + plotHeight}
          stroke="currentColor"
          className="text-slate-300 dark:text-slate-700"
          strokeWidth="1.5"
        />

        {/* Eje Y (Línea Vertical) */}
        <line
          x1={paddingLeft}
          y1={paddingTop - 5}
          x2={paddingLeft}
          y2={paddingTop + plotHeight}
          stroke="currentColor"
          className="text-slate-300 dark:text-slate-700"
          strokeWidth="1.5"
        />

        {/* Shaded Areas */}
        {stampsAreaPath && <path d={stampsAreaPath} fill="url(#blueGradient)" />}
        {rewardsAreaPath && <path d={rewardsAreaPath} fill="url(#orangeGradient)" />}

        {/* Línea Azul: Sellos */}
        <path
          d={stampsPath}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Línea Naranja: Canjes */}
        <path
          d={rewardsPath}
          fill="none"
          stroke="#f97316"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Puntos de la Línea Azul (Sellos) */}
        {timeSeries.map((point, i) => (
          <circle
            key={`stamp-dot-${point.date}`}
            cx={getX(i)}
            cy={getY(point.stamps)}
            r={hoveredIndex === i ? 6 : 3.5}
            fill="#2563eb"
            stroke="#ffffff"
            strokeWidth="2"
            className="transition-all duration-150"
          />
        ))}

        {/* Puntos de la Línea Naranja (Canjes) */}
        {timeSeries.map((point, i) => (
          <circle
            key={`reward-dot-${point.date}`}
            cx={getX(i)}
            cy={getY(point.rewards)}
            r={hoveredIndex === i ? 6 : 3.5}
            fill="#f97316"
            stroke="#ffffff"
            strokeWidth="2"
            className="transition-all duration-150"
          />
        ))}

        {/* Ticks y Fechas en Eje X */}
        {timeSeries.map((point, i) => {
          if (i % xTickStep !== 0 && i !== n - 1) return null;
          const xPos = getX(i);
          return (
            <text
              key={`x-label-${point.date}`}
              x={xPos}
              y={paddingTop + plotHeight + 18}
              textAnchor="middle"
              className="text-[10px] fill-slate-500 dark:fill-slate-400 font-medium"
            >
              {point.date.slice(5)}
            </text>
          );
        })}

        {/* Línea guía vertical de hover */}
        {hoveredIndex !== null && (
          <line
            x1={getX(hoveredIndex)}
            y1={paddingTop}
            x2={getX(hoveredIndex)}
            y2={paddingTop + plotHeight}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        )}

        {/* Columnas interactivas invisibles para hover */}
        {timeSeries.map((_, i) => {
          const colWidth = plotWidth / Math.max(n - 1, 1);
          const colX = n === 1 ? paddingLeft : getX(i) - colWidth / 2;
          return (
            <rect
              key={`hover-col-${i}`}
              x={Math.max(colX, paddingLeft)}
              y={paddingTop}
              width={colWidth}
              height={plotHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}
      </svg>

      {/* Tooltip flotante al pasar el mouse */}
      {hoveredPoint && hoveredIndex !== null && (
        <div
          style={{
            left: `${(getX(hoveredIndex) / svgWidth) * 100}%`,
            top: '8px',
          }}
          className="absolute -translate-x-1/2 bg-slate-900/95 dark:bg-slate-950/95 text-white text-xs px-3 py-2 rounded-xl shadow-xl pointer-events-none z-20 whitespace-nowrap border border-slate-700 flex flex-col gap-1"
        >
          <span className="font-bold text-slate-300 text-[11px]">{hoveredPoint.date}</span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span className="font-medium text-slate-200">Sellos: <strong className="text-white">{hoveredPoint.stamps}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            <span className="font-medium text-slate-200">Canjes: <strong className="text-white">{hoveredPoint.rewards}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-8" data-testid="analytics-skeleton-overview">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse"
          >
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
            <div className="flex items-baseline justify-between mb-4">
              <div className="h-9 w-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              <div className="h-6 w-14 bg-slate-100 dark:bg-slate-700/60 rounded-full" />
            </div>
            <div className="h-3.5 w-36 bg-slate-100 dark:bg-slate-700/50 rounded" />
          </div>
        ))}
      </div>

      {/* Chart & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="h-6 w-44 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
              <div className="h-3.5 w-64 bg-slate-100 dark:bg-slate-700/60 rounded" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-5 w-24 bg-slate-100 dark:bg-slate-700/60 rounded-full" />
              <div className="h-5 w-24 bg-slate-100 dark:bg-slate-700/60 rounded-full" />
            </div>
          </div>
          <div className="h-64 w-full bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-6 flex flex-col justify-between">
            <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="border-b border-dashed border-slate-200 dark:border-slate-700/60 w-full" />
            <div className="border-b border-dashed border-slate-200 dark:border-slate-700/60 w-full" />
            <div className="border-b border-dashed border-slate-200 dark:border-slate-700/60 w-full" />
            <div className="flex justify-between gap-4 pt-2">
              {Array.from({ length: 7 }).map((_, idx) => (
                <div key={idx} className="h-3 w-8 bg-slate-200 dark:bg-slate-700 rounded" />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse flex flex-col justify-between">
          <div>
            <div className="h-6 w-44 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
            <div className="h-3.5 w-56 bg-slate-100 dark:bg-slate-700/60 rounded mb-8" />
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full" />
              </div>
            </div>
          </div>
          <div className="h-16 w-full bg-slate-100/80 dark:bg-slate-700/40 rounded-2xl mt-8" />
        </div>
      </div>
    </div>
  );
}

function RetentionSkeleton() {
  return (
    <div className="space-y-8" data-testid="analytics-skeleton-retention">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Visit Frequency */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
          <div className="h-3.5 w-64 bg-slate-100 dark:bg-slate-700/60 rounded mb-8" />
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="flex justify-between mb-2">
                  <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Cohorts */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse">
          <div className="h-6 w-56 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
          <div className="h-3.5 w-64 bg-slate-100 dark:bg-slate-700/60 rounded mb-8" />
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3.5 w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3.5 w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3.5 w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3.5 w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="grid grid-cols-5 gap-3 py-2 items-center border-b border-slate-100 dark:border-slate-800">
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-10 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-10 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-10 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dormant Customers */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="h-6 w-44 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
            <div className="h-3.5 w-72 bg-slate-100 dark:bg-slate-700/60 rounded" />
          </div>
          <div className="h-8 w-28 bg-slate-100 dark:bg-slate-700 rounded-xl" />
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-24 ml-auto bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-3 gap-4 py-3 items-center border-b border-slate-100 dark:border-slate-800">
              <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-16 ml-auto bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PromotionsSkeleton() {
  return (
    <div className="space-y-8" data-testid="analytics-skeleton-promotions">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse">
        <div className="h-6 w-56 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
        <div className="h-3.5 w-80 bg-slate-100 dark:bg-slate-700/60 rounded mb-8" />
        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-16 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-16 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-24 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-24 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-16 ml-auto bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 py-3 items-center border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-700/60 rounded" />
              </div>
              <div className="h-4 w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-16 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-6 w-16 ml-auto bg-slate-100 dark:bg-slate-700/60 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StaffSkeleton() {
  return (
    <div className="space-y-8" data-testid="analytics-skeleton-staff">
      {/* Alert Banner Skeleton */}
      <div className="p-6 rounded-[2rem] bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 animate-pulse flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-72 bg-slate-200/60 dark:bg-slate-700/60 rounded" />
        </div>
      </div>

      {/* Staff Activity Table Skeleton */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
        <div className="h-3.5 w-80 bg-slate-100 dark:bg-slate-700/60 rounded mb-8" />
        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-20 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-20 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-24 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-20 ml-auto bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 py-3 items-center border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-24 bg-slate-100 dark:bg-slate-700/60 rounded" />
              </div>
              <div className="h-5 w-16 mx-auto bg-slate-100 dark:bg-slate-700/60 rounded-full" />
              <div className="h-4 w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-6 w-16 ml-auto bg-slate-100 dark:bg-slate-700/60 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsSkeleton({ activeTab }: { activeTab: TabType }) {
  return (
    <div
      data-testid="analytics-skeleton"
      aria-busy="true"
      aria-label="Cargando datos de analítica"
      className="transition-opacity duration-200"
    >
      {activeTab === 'overview' && <OverviewSkeleton />}
      {activeTab === 'retention' && <RetentionSkeleton />}
      {activeTab === 'promotions' && <PromotionsSkeleton />}
      {activeTab === 'staff' && <StaffSkeleton />}
    </div>
  );
}

export function Analytics({ merchantId }: AnalyticsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30d');
  const [dormantDays, setDormantDays] = useState<number>(30);

  // Date ranges
  const dateRange = useMemo(() => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    let fromDate: Date;

    if (periodPreset === '7d') {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (periodPreset === 'this_month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      from: fromDate.toISOString().slice(0, 10),
      to,
    };
  }, [periodPreset]);

  // Data states
  const [overview, setOverview] = useState<OverviewReport | null>(null);
  const [retention, setRetention] = useState<RetentionReport | null>(null);
  const [promotions, setPromotions] = useState<PromotionPerformanceReport | null>(null);
  const [staff, setStaff] = useState<StaffActivityReport | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!merchantId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadAllReports = async () => {
      try {
        const queryParams = {
          from: dateRange.from,
          to: dateRange.to,
          tz: 'America/Santiago',
        };

        const [ov, ret, prom, st] = await Promise.all([
          fetchOverviewReport(merchantId, queryParams),
          fetchRetentionReport(merchantId, { dormantDays, tz: 'America/Santiago' }),
          fetchPromotionsReport(merchantId, queryParams),
          fetchStaffActivityReport(merchantId, queryParams),
        ]);

        if (isMounted) {
          setOverview(ov);
          setRetention(ret);
          setPromotions(prom);
          setStaff(st);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error al cargar los reportes de analítica');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAllReports();

    return () => {
      isMounted = false;
    };
  }, [merchantId, dateRange, dormantDays]);

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-slate-900 dark:text-white">
            Analítica y Reportes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Métricas de retención, canjes, actividad de equipo y alertas antifraude.
          </p>
        </div>

        {/* Date presets */}
        <div className="flex items-center gap-2 bg-slate-200/60 dark:bg-slate-800 p-1.5 rounded-2xl self-start md:self-auto">
          <button
            onClick={() => setPeriodPreset('7d')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
              periodPreset === '7d'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Últimos 7 días
          </button>
          <button
            onClick={() => setPeriodPreset('30d')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
              periodPreset === '30d'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Últimos 30 días
          </button>
          <button
            onClick={() => setPeriodPreset('this_month')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
              periodPreset === 'this_month'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Este mes
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
          <p className="font-semibold text-sm">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'overview'
              ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Visión General
        </button>
        <button
          onClick={() => setActiveTab('retention')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'retention'
              ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Retención y Clientes Dormidos
        </button>
        <button
          onClick={() => setActiveTab('promotions')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'promotions'
              ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Rendimiento de Promociones
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
            activeTab === 'staff'
              ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Actividad de Equipo
        </button>
      </div>

      {/* Skeleton while loading */}
      {loading && <AnalyticsSkeleton activeTab={activeTab} />}

      {/* TAB 1: OVERVIEW */}
      {!loading && activeTab === 'overview' && overview && (
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tendencia de sellos y canjes entregados día a día</p>
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Auditoría de lecturas QR vs. Búsquedas Manuales</p>

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
                💡 <span className="font-semibold text-slate-700 dark:text-slate-200">Recomendación:</span> Si las búsquedas manuales superan el 30%, capacita al personal para promover el pase en Apple o Google Wallet.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RETENTION & DORMANT CUSTOMERS */}
      {!loading && activeTab === 'retention' && retention && (
        <div className="space-y-8" data-testid="tab-retention">
          {/* Frequency & Weekly grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Visit Frequency */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Frecuencia de Visitas</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Segmentación de clientes según visitas en el período</p>

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
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">% de clientes nuevos que siguen activos en meses posteriores</p>

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
                          <td className="py-3 text-center text-slate-600 dark:text-slate-400">{cohort.totalNewCustomers}</td>
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
                  onChange={(e) => setDormantDays(Number(e.target.value))}
                  className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border-none rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-brand-blue"
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
                        <td className="py-3 text-right font-bold text-rose-500">
                          {c.daysInactive} días
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PROMOTIONS */}
      {!loading && activeTab === 'promotions' && promotions && (
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
                        <td className="py-4 text-center font-medium text-rose-500">
                          {p.breakageCount}
                        </td>
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
      )}

      {/* TAB 4: STAFF ACTIVITY & ANTIFRAUD */}
      {!loading && activeTab === 'staff' && staff && (
        <div className="space-y-8" data-testid="tab-staff">
          {/* Antifraud Alerts Overview */}
          {(() => {
            const allAlerts = staff.staff.flatMap((s) => s.alerts);
            if (allAlerts.length === 0) {
              return (
                <div className="p-6 rounded-[2rem] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-4">
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
              );
            }

            return (
              <div className="p-6 rounded-[2rem] bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-4">
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
                      className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-amber-200/60 dark:border-amber-700/60 flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{alert.description}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          alert.severity === 'high'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}
                      >
                        Severidad {alert.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Staff Members Table */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Actividad de Equipo</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Desglose de sellos, canjes y proporción de uso de búsqueda manual por miembro del equipo.
            </p>

            {staff.staff.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No hay actividad de miembros del equipo registrada.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                      <th className="pb-3 font-semibold">Miembro del Equipo</th>
                      <th className="pb-3 font-semibold text-center">Rol</th>
                      <th className="pb-3 font-semibold text-center">Sellos Otorgados</th>
                      <th className="pb-3 font-semibold text-center">Canjes Procesados</th>
                      <th className="pb-3 font-semibold text-center">% Búsqueda Manual</th>
                      <th className="pb-3 font-semibold text-right">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {staff.staff.map((m) => (
                      <tr key={m.userId}>
                        <td className="py-4">
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {m.staffName || `Miembro ${m.userId.slice(0, 8)}`}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">{m.userId}</span>
                        </td>
                        <td className="py-4 text-center">
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {m.role}
                          </span>
                        </td>
                        <td className="py-4 text-center font-bold text-slate-900 dark:text-white">
                          {m.stampsCount}
                        </td>
                        <td className="py-4 text-center font-bold text-slate-900 dark:text-white">
                          {m.redeemsCount}
                        </td>
                        <td className="py-4 text-center">
                          <span
                            className={`font-semibold ${
                              m.manualPercentage > 50
                                ? 'text-rose-500 font-bold'
                                : 'text-slate-700 dark:text-slate-300'
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
                            <span className="text-xs text-slate-400">Normal</span>
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
      )}
    </div>
  );
}
