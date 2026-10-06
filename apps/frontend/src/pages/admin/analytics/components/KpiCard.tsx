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
}

export function KpiCard({
  title,
  current,
  previous,
  changePercentage,
  suffix = '',
}: KpiCardProps) {
  const change = formatChange(changePercentage);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-panel-border bg-panel-surface p-5 shadow-panel motion-safe:animate-[fw-panel-enter_300ms_ease-out] sm:p-6">
      <p className="mb-3 text-sm font-semibold text-panel-muted">{title}</p>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-3xl font-extrabold tracking-tight tabular-nums text-panel-text">
          {current.toLocaleString('es-CL')}
          {suffix}
        </span>
        <span
          className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-bold tabular-nums ${
            change.neutral
              ? 'bg-panel-soft text-panel-muted'
              : change.positive
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {change.text}
        </span>
      </div>
      <p className="text-xs text-panel-muted">
        Período anterior:{' '}
        <span className="font-medium tabular-nums text-panel-text">
          {previous.toLocaleString('es-CL')}
          {suffix}
        </span>
      </p>
    </div>
  );
}
