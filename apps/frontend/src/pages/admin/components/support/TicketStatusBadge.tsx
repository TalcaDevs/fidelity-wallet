import { TICKET_STATUS_LABELS, type TicketStatus } from '@fidelity/shared';
import { StatusBadge, type BadgeTone } from '../../../../components/ui/StatusBadge';

const STATUS_TONES: Record<TicketStatus, BadgeTone> = {
  OPEN: 'warning',
  IN_PROGRESS: 'info',
  WAITING_ON_MERCHANT: 'orange',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

export function TicketStatusBadge({
  status,
  labels = TICKET_STATUS_LABELS,
}: {
  status: TicketStatus;
  labels?: Record<TicketStatus, string>;
}) {
  return (
    <StatusBadge tone={STATUS_TONES[status]}>
      {labels[status]}
    </StatusBadge>
  );
}
