import { useState } from 'react';
import type { TimeSeriesPoint } from '../../../../services/reportsService';

export interface DailyEvolutionLineChartProps {
  timeSeries: TimeSeriesPoint[];
}

export function DailyEvolutionLineChart({ timeSeries }: DailyEvolutionLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!timeSeries || timeSeries.length === 0) {
    return (
      <div
        className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm gap-2"
        role="status"
        aria-live="polite"
      >
        <svg
          className="w-10 h-10 text-slate-300 dark:text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <span>Sin datos registrados para el período seleccionado</span>
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
    n === 1 ? paddingLeft + plotWidth / 2 : paddingLeft + (idx / Math.max(n - 1, 1)) * plotWidth;
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
        role="img"
        aria-label="Gráfico interactivo de evolución diaria de sellos y canjes"
      >
        <desc>Evolución de sellos entregados y premios canjeados a lo largo del tiempo</desc>
        <defs>
          <linearGradient id="stampsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="rewardsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Título de eje Y (Cantidad) */}
        <text
          x={paddingLeft - 38}
          y={paddingTop - 12}
          textAnchor="start"
          className="text-[11px] font-bold fill-slate-500 dark:fill-slate-400"
        >
          Cantidad
        </text>

        {/* Título de eje X (Días) */}
        <text
          x={svgWidth - paddingRight + 5}
          y={paddingTop + plotHeight + 18}
          textAnchor="start"
          className="text-[11px] font-bold fill-slate-500 dark:fill-slate-400"
        >
          Días
        </text>

        {/* Gridlines horizontales y Ticks de eje Y */}
        {yTicks.map((val) => {
          const yPos = getY(val);
          return (
            <g key={`y-tick-${val}`}>
              <line
                x1={paddingLeft}
                y1={yPos}
                x2={paddingLeft + plotWidth}
                y2={yPos}
                stroke="#94a3b8"
                strokeOpacity="0.2"
                strokeDasharray="4 4"
              />
              <text
                x={paddingLeft - 10}
                y={yPos + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-medium"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Eje X Línea base */}
        <line
          x1={paddingLeft}
          y1={paddingTop + plotHeight}
          x2={paddingLeft + plotWidth}
          y2={paddingTop + plotHeight}
          stroke="#94a3b8"
          strokeOpacity="0.3"
        />

        {/* Áreas bajo la curva (con gradiente) */}
        {stampsAreaPath && <path d={stampsAreaPath} fill="url(#stampsGradient)" />}
        {rewardsAreaPath && <path d={rewardsAreaPath} fill="url(#rewardsGradient)" />}

        {/* Línea Azul (Sellos) */}
        <path
          d={stampsPath}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Línea Naranja (Canjes) */}
        <path
          d={rewardsPath}
          fill="none"
          stroke="#f97316"
          strokeWidth="2.5"
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

        {/* Columnas interactivas con accesibilidad por teclado y mouse */}
        {timeSeries.map((point, i) => {
          const colWidth = plotWidth / Math.max(n - 1, 1);
          const colX = n === 1 ? paddingLeft : getX(i) - colWidth / 2;
          return (
            <rect
              key={`hover-col-${point.date}`}
              x={Math.max(colX, paddingLeft)}
              y={paddingTop}
              width={colWidth}
              height={plotHeight}
              fill="transparent"
              className="cursor-pointer focus:outline-none"
              tabIndex={0}
              role="button"
              aria-label={`Fecha ${point.date}: ${point.stamps} sellos, ${point.rewards} canjes`}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onFocus={() => setHoveredIndex(i)}
              onBlur={() => setHoveredIndex(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setHoveredIndex(i);
                }
              }}
            />
          );
        })}
      </svg>

      {/* Tooltip flotante */}
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
            <span className="font-medium text-slate-200">
              Sellos: <strong className="text-white">{hoveredPoint.stamps}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            <span className="font-medium text-slate-200">
              Canjes: <strong className="text-white">{hoveredPoint.rewards}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
