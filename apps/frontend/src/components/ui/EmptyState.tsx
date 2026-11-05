import type { ReactNode } from 'react';

export type EmptyStateVariant = 'default' | 'card' | 'dashed' | 'simple';

export interface EmptyStateProps {
  title: string;
  subtitle?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  variant?: EmptyStateVariant;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

export function EmptyState({
  title,
  subtitle,
  description,
  icon,
  action,
  variant = 'default',
  className = '',
  titleClassName,
  subtitleClassName,
}: EmptyStateProps) {
  const resolvedSubtitle = subtitle ?? description;

  if (variant === 'simple' && !icon && !resolvedSubtitle && !action) {
    return (
      <div className={`py-6 text-center text-sm text-panel-muted ${className}`} data-testid="empty-state">
        {title}
      </div>
    );
  }

  const containerClasses: Record<EmptyStateVariant, string> = {
    default: 'py-8 sm:py-12 px-4 text-center flex flex-col items-center justify-center',
    card: 'bg-panel-surface p-6 sm:p-10 rounded-2xl border border-panel-border shadow-panel text-center flex flex-col items-center justify-center',
    dashed: 'py-8 px-4 bg-panel-soft/30 rounded-2xl border border-dashed border-panel-border text-center flex flex-col items-center justify-center',
    simple: 'py-6 px-4 text-center flex flex-col items-center justify-center',
  };

  return (
    <div className={`${containerClasses[variant]} ${className}`} data-testid="empty-state">
      {icon && (
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-panel-soft text-panel-muted mb-3 sm:mb-4 shrink-0 [&>svg]:w-6 [&>svg]:h-6 sm:[&>svg]:w-8 sm:[&>svg]:h-8">
          {icon}
        </div>
      )}
      <p className={titleClassName ?? 'text-base sm:text-lg font-bold text-panel-text'}>
        {title}
      </p>
      {resolvedSubtitle && (
        <div className={subtitleClassName ?? 'text-xs sm:text-sm text-panel-muted mt-1 max-w-md mx-auto'}>
          {resolvedSubtitle}
        </div>
      )}
      {action && <div className="mt-4 sm:mt-5">{action}</div>}
    </div>
  );
}
