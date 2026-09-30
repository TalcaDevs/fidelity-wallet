export function formatChange(change: number | null): { text: string; positive: boolean; neutral: boolean } {
  if (change === null) return { text: 'N/A', positive: true, neutral: true };
  if (change === 0) return { text: '0%', positive: true, neutral: true };
  const sign = change > 0 ? '+' : '';
  return {
    text: `${sign}${change}%`,
    positive: change > 0,
    neutral: false,
  };
}

export interface KpiCardProps {
  title: string;
  current: number;
  previous: number;
  changePercentage: number | null;
  suffix?: string;
  loading?: boolean;
}

export function KpiCard({
  title,
  current,
  previous,
  changePercentage,
  suffix = '',
  loading = false,
}: KpiCardProps) {
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
        Período anterior:{' '}
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {previous.toLocaleString('es-CL')}
          {suffix}
        </span>
      </p>
    </div>
  );
}
