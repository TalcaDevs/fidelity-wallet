import { TICKET_STATUS_LABELS, type TicketStatus } from '@fidelity/shared';

// Record: si se agrega un estado al contrato, esto no compila hasta darle color.
const STATUS_CLASSES: Record<TicketStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-panel-accent',
  WAITING_ON_MERCHANT: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  CLOSED: 'bg-panel-soft text-panel-muted ',
};

export function TicketStatusBadge({
  status,
  labels = TICKET_STATUS_LABELS,
}: {
  status: TicketStatus;
  labels?: Record<TicketStatus, string>;
}) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${STATUS_CLASSES[status]}`}>
      {labels[status]}
    </span>
  );
}
