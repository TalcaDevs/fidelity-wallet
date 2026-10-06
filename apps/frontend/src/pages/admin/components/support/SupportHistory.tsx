import { TICKET_CATEGORY_LABELS, type TicketSummaryDto } from '@fidelity/shared';
import { ErrorAlert } from '../../../../components/ui/ErrorAlert';
import { formatDate, formatDateTime } from '../../../../lib/formatDate';
import { TicketStatusBadge } from './TicketStatusBadge';

export function SupportHistory({
  tickets,
  loading,
  error,
  onOpen,
}: {
  tickets: TicketSummaryDto[];
  loading: boolean;
  error: string | null;
  onOpen: (ticket: TicketSummaryDto) => void;
}) {
  return (
    <section className="bg-panel-surface rounded-2xl p-6 md:p-8 border border-panel-border shadow-panel">
      <h2 className="text-xl font-bold text-panel-text mb-6">Mis solicitudes</h2>

      {error ? (
        <ErrorAlert message={error} />
      ) : loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-panel-soft rounded-xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <p className="text-center py-10 text-panel-muted font-medium">Todavía no tienes solicitudes de soporte.</p>
      ) : (
        <ul className="divide-y divide-panel-border">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <button
                type="button"
                onClick={() => onOpen(ticket)}
                className="w-full text-left py-4 px-2 rounded-xl hover:bg-panel-soft transition-colors flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
              >
                <div className="flex items-center gap-2 sm:w-24 shrink-0">
                  {ticket.unreadForMerchant && (
                    <span className="w-2 h-2 rounded-full bg-panel-primary" aria-label="Respuesta nueva" />
                  )}
                  <span className="font-black text-panel-text">#{ticket.number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-panel-text">{TICKET_CATEGORY_LABELS[ticket.category]}</p>
                  <p className="text-xs text-panel-muted truncate">{ticket.excerpt}</p>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end shrink-0">
                  <TicketStatusBadge status={ticket.status} />
                  <span className="text-xs text-panel-muted" title={`Creada el ${formatDate(ticket.createdAt)}`}>
                    Última respuesta {formatDateTime(ticket.lastMessageAt)}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
