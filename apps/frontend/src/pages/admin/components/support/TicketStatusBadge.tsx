import { TICKET_STATUS_LABELS, type TicketStatus } from '@fidelity/shared';

// Record: si se agrega un estado al contrato, esto no compila hasta darle color.
const STATUS_CLASSES: Record<TicketStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  WAITING_ON_MERCHANT: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  CLOSED: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${STATUS_CLASSES[status]}`}>
      {TICKET_STATUS_LABELS[status]}
    </span>
  );
}
