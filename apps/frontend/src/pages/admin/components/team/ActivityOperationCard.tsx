import type { StaffActivityDto } from '@fidelity/shared';
import { ArrowIcon } from '../../../../components/ui/ArrowIcon';
import { formatDateTime } from '../../../../lib/formatDate';

const METHOD_CONFIG: Record<
  StaffActivityDto['method'],
  { label: string; badgeClass: string; icon: string }
> = {
  QR: {
    label: 'QR Wallet',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    icon: '📱',
  },
  MANUAL: {
    label: 'Ingreso manual',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    icon: '⌨️',
  },
  PANEL: {
    label: 'Desde el panel',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    icon: '🖥️',
  },
  WELCOME: {
    label: 'Bienvenida',
    badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
    icon: '🎉',
  },
};

function getScanBadge(scan: StaffActivityDto): {
  label: string;
  badgeClass: string;
  icon: string;
} {
  if (scan.type === 'REWARD_REDEEMED') {
    return {
      label: 'Premio canjeado',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
      icon: '🎁',
    };
  }
  const count = scan.stampCount ?? 1;
  const points = scan.pointsEarned ?? 0;

  if (count > 0 && points > 0) {
    const stampText = count === 1 ? '1 Sello' : `${count} Sellos`;
    const pointText = points === 1 ? '1 Punto' : `${points} Puntos`;
    return {
      label: `+${stampText} / +${pointText}`,
      badgeClass: 'bg-panel-primary/10 text-panel-primary border-panel-primary/20',
      icon: '🏷️',
    };
  }

  if (count === 0 && points > 0) {
    return {
      label: `+${points} ${points === 1 ? 'Punto entregado' : 'Puntos entregados'}`,
      badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
      icon: '⭐',
    };
  }

  return {
    label: `+${count} ${count === 1 ? 'Sello entregado' : 'Sellos entregados'}`,
    badgeClass: 'bg-panel-primary/10 text-panel-primary border-panel-primary/20',
    icon: '🏷️',
  };
}

interface ActivityOperationCardProps {
  scan: StaffActivityDto;
  visitsCount: number;
  onNavigateToCustomer: (customerId: string) => void;
}

export function ActivityOperationCard({
  scan,
  visitsCount,
  onNavigateToCustomer,
}: ActivityOperationCardProps) {
  const typeInfo = getScanBadge(scan);
  const methodInfo = METHOD_CONFIG[scan.method];
  const phone = scan.customerPhone;
  const customerId = scan.customerId;
  const isHighRecurrence = visitsCount >= 4;
  const hasCustomerLink = Boolean(customerId);

  const handleClick = () => {
    if (customerId) onNavigateToCustomer(customerId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && customerId) {
      e.preventDefault();
      onNavigateToCustomer(customerId);
    }
  };

  return (
    <li
      role={hasCustomerLink ? 'button' : undefined}
      tabIndex={hasCustomerLink ? 0 : undefined}
      onClick={hasCustomerLink ? handleClick : undefined}
      onKeyDown={hasCustomerLink ? handleKeyDown : undefined}
      title={hasCustomerLink ? 'Clic para ver ficha e historial de compras de este cliente' : undefined}
      className={`group rounded-2xl border p-4 shadow-sm transition-all text-left ${
        hasCustomerLink ? 'cursor-pointer hover:border-panel-accent hover:shadow-md' : ''
      } ${
        isHighRecurrence
          ? 'border-amber-500/40 bg-amber-500/[0.04] dark:bg-amber-500/[0.08]'
          : 'border-panel-border bg-panel-surface/80 hover:border-panel-border/80'
      }`}
    >
      {/* Cabecera de la operación */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${typeInfo.badgeClass}`}
        >
          <span>{typeInfo.icon}</span>
          <span>{typeInfo.label}</span>
        </span>
        <span className="text-xs font-medium text-panel-muted whitespace-nowrap">
          {formatDateTime(scan.createdAt)}
        </span>
      </div>

      {/* Detalle del cliente y recompensa */}
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-panel-muted text-xs">Cliente:</span>
          <span className="font-semibold text-panel-text text-xs tracking-wide">
            {phone ?? 'Sin teléfono registrado'}
          </span>
        </div>

        {scan.promotionName && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-panel-muted text-xs">Premio:</span>
            <span className="font-medium text-panel-text text-xs text-right truncate max-w-[200px]">
              {scan.promotionName}
            </span>
          </div>
        )}

        {scan.locationName && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-panel-muted text-xs">Sucursal:</span>
            <span className="text-panel-muted text-xs">{scan.locationName}</span>
          </div>
        )}
      </div>

      {/* Alerta de recurrencia si tiene 4 o más operaciones (corrobora alerta antifraude) */}
      {isHighRecurrence && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
          <span aria-hidden="true">⚠️</span>
          <span>Cliente frecuente ({visitsCount} visitas en este historial)</span>
        </div>
      )}
      {!isHighRecurrence && visitsCount >= 2 && (
        <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-panel-muted">
          <span aria-hidden="true">🔁</span>
          <span>{visitsCount} visitas en este historial</span>
        </div>
      )}

      {/* Footer con el método de escaneo y enlace a compras */}
      <div className="mt-3 pt-2.5 border-t border-panel-border/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-panel-muted">Método:</span>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${methodInfo.badgeClass}`}
          >
            <span>{methodInfo.icon}</span>
            <span>{methodInfo.label}</span>
          </span>
        </div>
        {hasCustomerLink && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-panel-accent group-hover:underline">
            <span>Ver compras</span>
            <ArrowIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5" />
          </span>
        )}
      </div>
    </li>
  );
}
