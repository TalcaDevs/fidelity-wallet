import { useCallback, useState, type FormEvent } from 'react';
import {
  TICKET_CATEGORY_LABELS,
  TICKET_TEXT_MAX,
  type TicketAttachmentDto,
  type TicketDetailDto,
} from '@fidelity/shared';
import { Modal } from '../../../../components/ui/Modal';
import { ErrorAlert } from '../../../../components/ui/ErrorAlert';
import { useAsyncData } from '../../../../hooks/useAsyncData';
import { formatDateTime } from '../../../../lib/formatDate';
import { AttachmentPicker } from './AttachmentPicker';
import { TicketStatusBadge } from './TicketStatusBadge';

function Attachments({ items }: { items: TicketAttachmentDto[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {items.map((a) => (
        // La URL firmada vence en 5 minutos: se abre en el momento, no se guarda.
        <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-brand-blue underline">
          {a.fileName}
        </a>
      ))}
    </div>
  );
}

/** Hilo sin notas internas (el backend no las envía) y caja de respuesta (§6.6). */
export function TicketDetail({
  ticketId,
  onClose,
  onLoad,
  onReply,
}: {
  ticketId: string;
  onClose: () => void;
  onLoad: (ticketId: string) => Promise<TicketDetailDto>;
  onReply: (ticketId: string, body: string, attachment: File | null) => Promise<TicketDetailDto | null>;
}) {
  const fetcher = useCallback(() => onLoad(ticketId), [onLoad, ticketId]);
  const { data: ticket, loading, error, setData } = useAsyncData(fetcher);
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    const updated = await onReply(ticketId, body.trim(), attachment);
    setSending(false);
    if (updated) {
      setData(() => updated);
      setBody('');
      setAttachment(null);
    }
  }

  return (
    <Modal title={ticket ? `Solicitud #${ticket.number}` : 'Solicitud'} onClose={onClose}>
      {error ? (
        <ErrorAlert message={error} />
      ) : loading || !ticket ? (
        <div className="animate-pulse h-40 bg-slate-100 dark:bg-slate-800 rounded-xl" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <TicketStatusBadge status={ticket.status} />
            <span className="text-sm text-slate-500">
              {TICKET_CATEGORY_LABELS[ticket.category]}
              {ticket.locationName ? ` · ${ticket.locationName}` : ''}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Tú · {formatDateTime(ticket.createdAt)}</p>
            <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{ticket.description}</p>
            <Attachments items={ticket.attachments} />
          </div>

          {ticket.messages.map((message) => (
            <div
              key={message.id}
              className={`p-4 rounded-xl border ${message.authorType === 'PLATFORM' ? 'bg-brand-blue/5 border-brand-blue/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}
            >
              <p className="text-xs text-slate-400 mb-1">
                {message.authorType === 'PLATFORM' ? message.authorName : 'Tú'} · {formatDateTime(message.createdAt)}
              </p>
              <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{message.body}</p>
              <Attachments items={message.attachments} />
            </div>
          ))}

          {ticket.status === 'CLOSED' ? (
            <p className="text-sm text-slate-500">Esta solicitud está cerrada. Si necesitas más ayuda, crea una nueva.</p>
          ) : (
            <form onSubmit={handleReply} className="space-y-3">
              <label htmlFor="ticket-reply" className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                {ticket.status === 'RESOLVED' ? 'Responder (reabre la solicitud)' : 'Responder'}
              </label>
              <textarea
                id="ticket-reply"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={TICKET_TEXT_MAX}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/50 resize-y"
              />
              <AttachmentPicker id="ticket-reply-attachment" file={attachment} onChange={setAttachment} />
              <button
                type="submit"
                disabled={!body.trim() || sending}
                className="w-full py-3 rounded-xl bg-brand-blue hover:bg-blue-600 text-white font-bold disabled:opacity-50"
              >
                {sending ? 'Enviando...' : 'Enviar respuesta'}
              </button>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}
