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
  tooltip?: string;
}

export function KpiCard({
  title,
  current,
  previous,
  changePercentage,
  suffix = '',
  tooltip,
}: KpiCardProps) {
  const change = formatChange(changePercentage);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-panel-border bg-panel-surface p-5 shadow-panel motion-safe:animate-[fw-panel-enter_300ms_ease-out] sm:p-6">
      <div className="mb-3 flex items-center gap-1.5">
        <p className="text-sm font-semibold text-panel-muted truncate">{title}</p>
        {tooltip && (
          <span
            className="relative group/tooltip inline-flex items-center cursor-help shrink-0"
            tabIndex={0}
            aria-label={tooltip}
            title={tooltip}
          >
            <svg className="w-4 h-4 text-panel-muted/80 hover:text-panel-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block group-focus/tooltip:block z-30 w-56 rounded-xl bg-gray-900 dark:bg-neutral-800 p-2.5 text-center text-xs font-normal text-white shadow-xl border border-white/10 leading-snug">
              {tooltip}
            </span>
          </span>
        )}
      </div>
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
