import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeTone = 'success' | 'warning' | 'info' | 'danger' | 'orange' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

export const TONE_CLASSES: Record<BadgeTone, { badge: string; dot: string }> = {
  success: {
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  warning: {
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
    dot: 'bg-amber-500',
  },
  info: {
    badge: 'bg-panel-accent/10 text-panel-accent border border-panel-accent/20',
    dot: 'bg-panel-accent',
  },
  orange: {
    badge: 'bg-panel-orange/10 text-panel-orange border border-panel-orange/20',
    dot: 'bg-panel-orange',
  },
  danger: {
    badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
    dot: 'bg-rose-500',
  },
  neutral: {
    badge: 'bg-panel-soft text-panel-muted border border-panel-border/60',
    dot: 'bg-panel-muted',
  },
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-xs sm:text-sm',
};

export function StatusBadge({
  children,
  tone = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  ...rest
}: StatusBadgeProps) {
  const styles = TONE_CLASSES[tone];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold whitespace-nowrap shrink-0 transition-colors ${sizeClass} ${styles.badge} ${className}`.trim()}
      {...rest}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} aria-hidden="true" />}
      {children}
    </span>
  );
}
