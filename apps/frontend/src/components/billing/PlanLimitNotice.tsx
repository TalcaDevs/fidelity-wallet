import type { ReactNode } from 'react';
import { ROUTES } from '../routing/routePaths';

export interface PlanLimitNoticeProps {
  current: number;
  limit: number | null;
  resourceName: string;
  actionVerb?: string;
  upgradeHref?: string;
  showUpgradeLink?: boolean;
  showWhenUnlimited?: boolean;
  variant?: 'inline' | 'banner';
  className?: string;
}

export function PlanLimitNotice({
  current,
  limit,
  resourceName,
  actionVerb = 'agregar más',
  upgradeHref = ROUTES.billing,
  showUpgradeLink = true,
  showWhenUnlimited = false,
  variant = 'inline',
  className = '',
}: PlanLimitNoticeProps) {
  if (limit === null && !showWhenUnlimited) {
    return null;
  }

  const atLimit = limit !== null && current >= limit;

  if (variant === 'banner') {
    if (!atLimit) return null;

    return (
      <div
        role="alert"
        className={`rounded-2xl border border-orange-500/30 bg-orange-500/10 dark:bg-orange-950/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-panel-text ${className}`.trim()}
      >
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 font-bold" aria-hidden="true">
            ⚠️
          </span>
          <div>
            <p className="font-bold text-sm text-orange-700 dark:text-orange-400">
              Llegaste al límite de {resourceName} ({current} de {limit})
            </p>
            <p className="text-xs text-panel-muted mt-0.5">
              Sube de plan para {actionVerb}.
            </p>
          </div>
        </div>
        {showUpgradeLink && (
          <a
            href={upgradeHref}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs font-bold shrink-0 text-center transition-all shadow-xs"
          >
            Subir de plan
          </a>
        )}
      </div>
    );
  }

  return (
    <p
      className={`text-sm font-bold ${atLimit ? 'text-orange-600' : 'text-panel-muted'} ${className}`.trim()}
    >
      {limit === null ? (
        `${current} ${resourceName} (Ilimitado)`
      ) : (
        <>
          {current} de {limit} {resourceName}
          {atLimit && (
            <>
              {' · llegaste al límite: '}
              {showUpgradeLink ? (
                <a
                  href={upgradeHref}
                  className="underline underline-offset-2 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                >
                  sube de plan
                </a>
              ) : (
                'sube de plan'
              )}
              {` para ${actionVerb}`}
            </>
          )}
        </>
      )}
    </p>
  );
}

export interface PlanUsageBarProps {
  label: string;
  used: number;
  limit: number | null;
  className?: string;
  children?: ReactNode;
}

export function PlanUsageBar({
  label,
  used,
  limit,
  className = '',
  children,
}: PlanUsageBarProps) {
  const percent = limit === null ? 0 : Math.min(100, (used / limit) * 100);
  const nearLimit = limit !== null && percent >= 80;

  return (
    <div className={`bg-panel-soft rounded-2xl p-5 border border-panel-border ${className}`.trim()}>
      <div className="flex justify-between items-center mb-3 gap-2">
        <span className="text-sm font-bold text-panel-muted">{label}</span>
        <span className="text-sm font-black text-panel-text whitespace-nowrap">
          {used} <span className="text-panel-muted font-medium">de {limit ?? '∞'}</span>
        </span>
      </div>
      <div className="h-2.5 w-full bg-panel-muted/20 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${nearLimit ? 'bg-orange-500' : 'bg-panel-primary'}`}
          style={{ width: `${limit === null ? 100 : percent}%` }}
        />
      </div>
      {children}
    </div>
  );
}
