import type { ReactNode } from 'react';
import { getPlan, type BrandStatus, type PlanId } from '@fidelity/shared';

export const CARD = 'bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700';
export const INPUT =
  'px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500';
export const BUTTON = 'px-3 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50';
export const PRIMARY = `${BUTTON} bg-violet-600 hover:bg-violet-700 text-white`;
export const SECONDARY = `${BUTTON} bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700`;

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
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
    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 whitespace-nowrap">
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
      <span className="text-slate-500">{page} de {pages}</span>
      <button type="button" className={SECONDARY} disabled={page >= pages} onClick={() => onPage(page + 1)}>Siguiente</button>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-center text-slate-500 py-10">{children}</p>;
}
