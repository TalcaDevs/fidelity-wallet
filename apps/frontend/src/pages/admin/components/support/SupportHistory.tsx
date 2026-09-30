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
    <section className="bg-white dark:bg-slate-800/80 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/20 dark:shadow-none">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Mis solicitudes</h2>

      {error ? (
        <ErrorAlert message={error} />
      ) : loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-900 rounded-xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <p className="text-center py-10 text-slate-500 font-medium">Todavía no tienes solicitudes de soporte.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <button
                type="button"
                onClick={() => onOpen(ticket)}
                className="w-full text-left py-4 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
              >
                <div className="flex items-center gap-2 sm:w-24 shrink-0">
                  {ticket.unreadForMerchant && (
                    <span className="w-2 h-2 rounded-full bg-brand-blue" aria-label="Respuesta nueva" />
                  )}
                  <span className="font-black text-slate-900 dark:text-white">#{ticket.number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-700 dark:text-slate-300">{TICKET_CATEGORY_LABELS[ticket.category]}</p>
                  <p className="text-xs text-slate-500 truncate">{ticket.excerpt}</p>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end shrink-0">
                  <TicketStatusBadge status={ticket.status} />
                  <span className="text-xs text-slate-400" title={`Creada el ${formatDate(ticket.createdAt)}`}>
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
