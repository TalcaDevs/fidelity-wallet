import { ArrowIcon } from './ArrowIcon';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  itemLabel?: string;
  ariaLabelPrev?: string;
  ariaLabelNext?: string;
  onPageChange: (newPage: number) => void;
  hideOnSinglePage?: boolean;
  className?: string;
  variant?: 'panel' | 'card' | 'simple' | 'ghost';
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  itemLabel,
  ariaLabelPrev,
  ariaLabelNext,
  onPageChange,
  hideOnSinglePage = true,
  className = '',
  variant = 'panel',
}: PaginationProps) {
  if (hideOnSinglePage && totalPages <= 1) {
    return null;
  }

  const prevAria = ariaLabelPrev ?? (itemLabel ? `Página anterior de ${itemLabel}` : undefined);
  const nextAria = ariaLabelNext ?? (itemLabel ? `Página siguiente de ${itemLabel}` : undefined);

  const showSummary = totalItems !== undefined && pageSize !== undefined;
  const from = (totalItems ?? 0) === 0 ? 0 : (currentPage - 1) * (pageSize ?? 0) + 1;
  const to = Math.min(currentPage * (pageSize ?? 0), totalItems ?? 0);

  const variantStyles = {
    panel: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-panel-soft/60 border-t border-panel-border',
    card: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-panel-surface border-t border-panel-border',
    simple: 'flex items-center justify-between gap-3 p-4 border-t border-panel-border text-sm',
    ghost: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-panel-border/60 mt-4',
  };

  return (
    <nav
      role="navigation"
      aria-label="Paginación"
      className={`${variantStyles[variant]} ${className}`.trim()}
    >
      {showSummary ? (
        <p className="text-xs text-panel-muted font-medium text-center sm:text-left">
          Mostrando{' '}
          <span className="font-semibold text-panel-text">
            {from} - {to}
          </span>{' '}
          de <span className="font-semibold text-panel-text">{totalItems}</span>{' '}
          {itemLabel ?? 'elementos'}
        </p>
      ) : null}

      <div className={`flex items-center gap-2 ${showSummary ? 'justify-center' : 'w-full justify-between'}`}>
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          aria-label={prevAria}
          className="px-3 py-1.5 text-xs font-bold rounded-xl border border-panel-border bg-panel-surface text-panel-text hover:bg-panel-soft disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
        >
          <ArrowIcon direction="left" className="w-3.5 h-3.5" />
          <span>Anterior</span>
        </button>

        <span className="text-xs font-semibold text-panel-muted px-2">
          Página {currentPage} de {totalPages}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          aria-label={nextAria}
          className="px-3 py-1.5 text-xs font-bold rounded-xl border border-panel-border bg-panel-surface text-panel-text hover:bg-panel-soft disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
        >
          <span>Siguiente</span>
          <ArrowIcon direction="right" className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
}
