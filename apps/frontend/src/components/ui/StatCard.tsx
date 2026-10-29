import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';
import { PANEL_SURFACE } from '../admin/panelStyles';

export type StatCardColor = 'blue' | 'yellow' | 'orange' | 'emerald' | 'neutral';
export type StatCardFootnoteTone = 'positive' | 'neutral' | 'subtle';

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

const COLOR_STYLES: Record<StatCardColor, { glow: string; iconBg: string; iconText: string }> = {
  blue: {
    glow: 'bg-panel-accent/10',
    iconBg: 'bg-panel-accent/10',
    iconText: 'text-panel-accent',
  },
  yellow: {
    glow: 'bg-panel-gold/10',
    iconBg: 'bg-panel-gold/10',
    iconText: 'text-panel-gold',
  },
  orange: {
    glow: 'bg-panel-orange/10',
    iconBg: 'bg-panel-orange/10',
    iconText: 'text-panel-orange',
  },
  emerald: {
    glow: 'bg-emerald-500/10',
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-600 dark:text-emerald-400',
  },
  neutral: {
    glow: 'bg-panel-border/20',
    iconBg: 'bg-panel-soft',
    iconText: 'text-panel-muted',
  },
};

const FOOTNOTE_STYLES: Record<'positive' | 'neutral', string> = {
  positive: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
  neutral: 'text-panel-muted bg-panel-soft',
};

export interface StatCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  icon?: ReactNode;
  color?: StatCardColor;
  footnote?: ReactNode;
  footnoteTone?: StatCardFootnoteTone;
  changePercentage?: number | null;
  previousValue?: number | string;
  previousLabel?: string;
  tooltip?: string;
  loading?: boolean;
  className?: string;
  valueClassName?: string;
}

export function StatCard({
  title,
  value,
  suffix = '',
  icon,
  color = 'blue',
  footnote,
  footnoteTone = 'positive',
  changePercentage,
  previousValue,
  previousLabel = 'Período anterior:',
  tooltip,
  loading = false,
  className = '',
  valueClassName,
}: StatCardProps) {
  const styles = COLOR_STYLES[color];
  const formattedValue = typeof value === 'number' ? value.toLocaleString('es-CL') : value;
  const resolvedValueClassName =
    valueClassName ??
    (icon
      ? 'text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight tabular-nums text-panel-text'
      : 'text-3xl font-extrabold tracking-tight tabular-nums text-panel-text');

  return (
    <div className={`${PANEL_SURFACE} relative overflow-hidden p-4 sm:p-5 lg:p-6 group transition-all ${className}`}>
      {icon && <div className={`absolute -right-10 -top-10 w-32 h-32 ${styles.glow} rounded-full blur-3xl`} />}

      <div className={`flex items-center ${icon ? 'gap-2.5 sm:gap-3 mb-3 sm:mb-5' : 'gap-1.5 mb-3'} relative z-10`}>
        {icon && (
          <div className={`w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-xl [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6 ${styles.iconBg} flex items-center justify-center ${styles.iconText}`}>
            {icon}
          </div>
        )}
        <h3 className="text-xs sm:text-sm font-semibold text-panel-muted truncate">{title}</h3>
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

      {loading ? (
        <div className="h-[48px] sm:h-[60px] flex items-center relative z-10">
          <Skeleton data-testid="stat-skeleton" className="h-9 sm:h-10 w-24 rounded-xl" />
        </div>
      ) : changePercentage !== undefined ? (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 relative z-10">
          <span className={resolvedValueClassName}>
            {formattedValue}
            {suffix}
          </span>
          {(() => {
            const change = formatChange(changePercentage);
            return (
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
            );
          })()}
        </div>
      ) : (
        <div className={`mb-3 sm:mb-4 relative z-10 ${resolvedValueClassName}`}>
          {formattedValue}
          {suffix}
        </div>
      )}

      {previousValue !== undefined && (
        <p className="text-xs text-panel-muted relative z-10">
          {previousLabel}{' '}
          <span className="font-medium tabular-nums text-panel-text">
            {typeof previousValue === 'number' ? previousValue.toLocaleString('es-CL') : previousValue}
            {suffix}
          </span>
        </p>
      )}

      {footnote && (
        <p
          className={
            footnoteTone === 'subtle'
              ? 'text-xs text-panel-muted mt-1 relative z-10'
              : `text-xs sm:text-sm font-semibold relative z-10 inline-flex items-center px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full ${FOOTNOTE_STYLES[footnoteTone]}`
          }
        >
          {footnoteTone === 'positive' && (
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          )}
          {footnote}
        </p>
      )}
    </div>
  );
}
