import { useCallback, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS_INTERNAL as TICKET_STATUS_LABELS,
  TICKET_TEXT_MAX,
  TICKET_TRANSITIONS,
  type InternalTicketDto,
  type TicketPriority,
  type TicketStatus,
} from '@fidelity/shared';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { errorMessage, useAsyncData } from '../../hooks/useAsyncData';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../lib/formatDate';
import {
  getInternalTicket,
  listInternalTickets,
  replyInternalTicket,
  updateInternalTicket,
  type TicketFilters,
} from '../../services/internalService';
import { AttachmentPicker } from '../admin/components/support/AttachmentPicker';
import { TicketStatusBadge } from '../admin/components/support/TicketStatusBadge';
import { useInternalUser } from './internalRole';
import { CARD, Empty, INPUT, PRIMARY, PageHeader, Pager, SECONDARY } from './ui';

const PRIORITY_LABELS: Record<TicketPriority, string> = { LOW: 'Baja', NORMAL: 'Normal', HIGH: 'Alta', URGENT: 'Urgente' };
const PRIORITY_CLASSES: Record<TicketPriority, string> = {
  LOW: 'text-slate-500',
  NORMAL: 'text-slate-700 dark:text-slate-300',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600',
};

type Assigned = 'all' | 'mine' | 'none';

function TicketRow({ ticket, selected, onSelect }: { ticket: InternalTicketDto; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 border-b border-slate-100 dark:border-slate-700/60 transition-colors ${selected ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-sm">#{ticket.number} · {ticket.brandName}</span>
        <TicketStatusBadge status={ticket.status} labels={TICKET_STATUS_LABELS} />
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{ticket.excerpt}</p>
      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
        <span>{TICKET_CATEGORY_LABELS[ticket.category]}</span>
        <span className={`font-bold ${PRIORITY_CLASSES[ticket.priority]}`}>{PRIORITY_LABELS[ticket.priority]}</span>
        <span className="ml-auto whitespace-nowrap">{formatDateTime(ticket.lastMessageAt)}</span>
      </div>
    </button>
  );
}

function TicketPanel({ ticketId, onChanged }: { ticketId: string; onChanged: (t: InternalTicketDto) => void }) {
  const { userId } = useInternalUser();
  const { notifyError, notifySuccess } = useToast();
  const fetcher = useCallback(() => getInternalTicket(ticketId), [ticketId]);
  const { data: ticket, loading, error, setData } = useAsyncData(fetcher);
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = (updated: InternalTicketDto) => {
    setData(() => updated);
    onChanged(updated);
  };

  async function run(action: () => Promise<InternalTicketDto>, success?: string) {
    setBusy(true);
    try {
      apply(await action());
      if (success) notifySuccess(success);
      return true;
    } catch (err) {
      notifyError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const ok = await run(
      () => replyInternalTicket(ticketId, { body: body.trim(), isInternal }, attachment),
      isInternal ? 'Nota interna guardada' : 'Respuesta enviada',
    );
    if (ok) {
      setBody('');
      setAttachment(null);
    }
  }

  if (loading && !ticket) return <div className={`${CARD} p-8 animate-pulse h-96`} />;
  if (error || !ticket) return <ErrorAlert message={error ?? 'No se pudo abrir el ticket'} />;

  const transitions = TICKET_TRANSITIONS[ticket.status];
  const closed = ticket.status === 'CLOSED';

  return (
    <div className={`${CARD} p-5 sm:p-6 space-y-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold">#{ticket.number} · {TICKET_CATEGORY_LABELS[ticket.category]}</h2>
          <p className="text-sm text-slate-500 mt-1">
            <Link to={`/internal/brands/${ticket.brandId}`} className="font-bold text-violet-600 hover:underline">{ticket.brandName}</Link>
            {ticket.locationName && ` · ${ticket.locationName}`} · {ticket.createdBy.email ?? 'Dueño'}
            {ticket.contactPhone && ` · ${ticket.contactPhone}`}
          </p>
        </div>
        <TicketStatusBadge status={ticket.status} labels={TICKET_STATUS_LABELS} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Prioridad"
          value={ticket.priority}
          disabled={busy || closed}
          onChange={(e) => void run(() => updateInternalTicket(ticketId, { priority: e.target.value as TicketPriority }))}
          className={INPUT}
        >
          {TICKET_PRIORITIES.map((p) => <option key={p} value={p}>Prioridad {PRIORITY_LABELS[p].toLowerCase()}</option>)}
        </select>
        {ticket.assignee?.userId === userId ? (
          <button type="button" className={SECONDARY} disabled={busy} onClick={() => void run(() => updateInternalTicket(ticketId, { assigneeId: null }))}>
            Quitar asignación
          </button>
        ) : (
          <button type="button" className={SECONDARY} disabled={busy || closed} onClick={() => void run(() => updateInternalTicket(ticketId, { assigneeId: userId }), 'Ticket asignado a ti')}>
            Asignarme{ticket.assignee ? ` (hoy: ${ticket.assignee.name})` : ''}
          </button>
        )}
        {transitions.map((to) => (
          <button key={to} type="button" className={to === 'CLOSED' ? SECONDARY : PRIMARY} disabled={busy} onClick={() => void run(() => updateInternalTicket(ticketId, { status: to }), `Ticket: ${TICKET_STATUS_LABELS[to]}`)}>
            → {TICKET_STATUS_LABELS[to]}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-4">
        <p className="text-xs font-bold text-slate-500 mb-1">{formatDateTime(ticket.createdAt)}</p>
        <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
        {ticket.attachments.map((a) => (
          <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 mr-3 text-xs font-bold text-violet-600 underline">{a.fileName}</a>
        ))}
      </div>

      <ol className="space-y-3">
        {ticket.messages.map((m) => (
          <li
            key={m.id}
            className={`rounded-xl p-4 text-sm ${m.isInternal ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30' : m.authorType === 'PLATFORM' ? 'bg-violet-50 dark:bg-violet-500/10 ml-6' : 'bg-slate-50 dark:bg-slate-900/60 mr-6'}`}
          >
            <p className="text-xs font-bold text-slate-500 mb-1">
              {m.authorName} · {formatDateTime(m.createdAt)}
              {m.isInternal && <span className="ml-2 text-amber-700 dark:text-amber-400">Nota interna</span>}
            </p>
            <p className="whitespace-pre-wrap">{m.body}</p>
            {m.attachments.map((a) => (
              <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 mr-3 text-xs font-bold text-violet-600 underline">{a.fileName}</a>
            ))}
          </li>
        ))}
      </ol>

      {closed ? (
        <p className="text-sm text-slate-500">El ticket está cerrado.</p>
      ) : (
        <form onSubmit={handleReply} className="space-y-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={TICKET_TEXT_MAX}
            rows={4}
            placeholder={isInternal ? 'Nota para el equipo (el dueño no la ve)' : 'Respuesta para el dueño'}
            className={`${INPUT} w-full ${isInternal ? 'border-amber-300' : ''}`}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
              Nota interna
            </label>
            <AttachmentPicker id="internal-reply-attachment" file={attachment} onChange={setAttachment} />
            <button type="submit" disabled={busy || !body.trim()} className={`${PRIMARY} ml-auto`}>
              {isInternal ? 'Guardar nota' : 'Responder'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Bandeja de soporte de todas las marcas (HANDOFF §11.4). */
export function InternalTickets() {
  const { userId } = useInternalUser();
  const [params, setParams] = useSearchParams();
  const selected = params.get('ticket');
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [category, setCategory] = useState('');
  const [assigned, setAssigned] = useState<Assigned>('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const brandId = params.get('brandId') ?? undefined;

  const fetcher = useCallback(() => {
    const filters: TicketFilters = {
      status: status || undefined,
      category: (category || undefined) as TicketFilters['category'],
      assigneeId: assigned === 'mine' ? userId : assigned === 'none' ? 'none' : undefined,
      brandId,
      q: search || undefined,
      page,
    };
    return listInternalTickets(filters);
  }, [status, category, assigned, userId, brandId, search, page]);
  const { data, loading, error, setData } = useAsyncData(fetcher);

  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('ticket', id);
    else next.delete('ticket');
    setParams(next, { replace: true });
  };

  const onChanged = (t: InternalTicketDto) =>
    setData((prev) => (prev ? { ...prev, items: prev.items.map((i) => (i.id === t.id ? t : i)) } : prev));

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  return (
    <div>
      <PageHeader title="Tickets de soporte" subtitle={brandId ? 'Filtrado por una marca' : 'Todas las marcas'} />

      <div className="flex flex-wrap gap-2 mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q.trim());
            setPage(1);
          }}
          className="flex gap-2"
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="#número, texto o marca" className={INPUT} />
          <button type="submit" className={SECONDARY}>Buscar</button>
        </form>
        <select aria-label="Estado" value={status} onChange={(e) => resetPage(setStatus)(e.target.value as TicketStatus | '')} className={INPUT}>
          <option value="">Todos los estados</option>
          {TICKET_STATUSES.map((s) => <option key={s} value={s}>{TICKET_STATUS_LABELS[s]}</option>)}
        </select>
        <select aria-label="Categoría" value={category} onChange={(e) => resetPage(setCategory)(e.target.value)} className={INPUT}>
          <option value="">Todas las categorías</option>
          {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{TICKET_CATEGORY_LABELS[c]}</option>)}
        </select>
        <select aria-label="Asignación" value={assigned} onChange={(e) => resetPage(setAssigned)(e.target.value as Assigned)} className={INPUT}>
          <option value="all">Todos</option>
          <option value="mine">Asignados a mí</option>
          <option value="none">Sin asignar</option>
        </select>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
        <section className={`${CARD} overflow-hidden self-start`}>
          {loading && !data ? (
            <div className="p-6 animate-pulse space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-900" />)}</div>
          ) : data && data.items.length > 0 ? (
            <>
              {data.items.map((t) => <TicketRow key={t.id} ticket={t} selected={t.id === selected} onSelect={() => select(t.id)} />)}
              <div className="px-4 pb-4"><Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} /></div>
            </>
          ) : (
            <Empty>No hay tickets con esos filtros.</Empty>
          )}
        </section>
        <section>
          {selected ? <TicketPanel key={selected} ticketId={selected} onChanged={onChanged} /> : <Empty>Selecciona un ticket para ver el hilo.</Empty>}
        </section>
      </div>
    </div>
  );
}
