import type { ReactNode } from 'react';
import { getPlan, type BrandStatus, type PlanId } from '@fidelity/shared';

export const CARD = 'bg-panel-surface rounded-2xl border border-panel-border shadow-panel';
export const INPUT =
  'px-3 py-2 rounded-xl border border-panel-border bg-panel-surface text-sm text-panel-text focus:outline-none focus:ring-2 focus:ring-panel-accent';
export const BUTTON = 'min-h-11 px-3 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50';
export const PRIMARY = `${BUTTON} bg-panel-primary hover:bg-panel-primary/90 text-white`;
export const SECONDARY = `${BUTTON} bg-panel-soft text-panel-text hover:bg-panel-accent/10`;

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div data-panel-reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-panel-muted mt-1">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function BrandStatusBadge({ status }: { status: BrandStatus }) {
  return status === 'ACTIVE' ? (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">Activa</span>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">Suspendida</span>
  );
}

export function PlanBadge({ planId }: { planId: PlanId }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-panel-accent/10 text-panel-accent whitespace-nowrap">
      {getPlan(planId).name}
    </span>
  );
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 mt-4 text-sm">
      <button type="button" className={SECONDARY} disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
      <span className="text-panel-muted">{page} de {pages}</span>
      <button type="button" className={SECONDARY} disabled={page >= pages} onClick={() => onPage(page + 1)}>Siguiente</button>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-center text-panel-muted py-10">{children}</p>;
}
