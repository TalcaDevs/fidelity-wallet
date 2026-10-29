import { useMemo, useState } from 'react';
import { balanceUnit, type CustomerHistoryDto, type PurchaseHistoryEntryDto } from '@fidelity/shared';
import { formatBirthday, formatDate, formatDateTime } from '../../lib/formatDate';
import { SegmentedTabs } from '../ui/SegmentedTabs';
import { Pagination } from '../ui/Pagination';
import { EmptyState } from '../ui/EmptyState';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const CARD = 'bg-panel-surface rounded-2xl border border-panel-border shadow-panel';

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-wider text-panel-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-panel-text break-words">{value ?? '—'}</dd>
    </div>
  );
}

function Stat({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-panel-soft border border-panel-border rounded-xl p-3.5 sm:p-4 flex flex-col justify-between transition-colors">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-panel-muted">{label}</p>
        <p className="mt-1 text-xl sm:text-2xl font-extrabold tabular-nums tracking-tight text-panel-text">
          {value}
        </p>
      </div>
      {subtext && <p className="mt-1.5 text-[11px] text-panel-muted font-medium">{subtext}</p>}
    </div>
  );
}

function EntryRow({
  entry,
  onVoid,
}: {
  entry: PurchaseHistoryEntryDto;
  onVoid?: (entry: PurchaseHistoryEntryDto) => void;
}) {
  const isStamp = entry.type === 'STAMP_ADDED';
  const isVoided = Boolean(entry.voidedAt);
  const quantities = [
    entry.stamps > 0 ? `${entry.stamps} ${balanceUnit('STAMPS', entry.stamps)}` : '',
    (entry.points ?? 0) > 0 ? `${entry.points} ${balanceUnit('POINTS', entry.points)}` : '',
  ].filter(Boolean).join(' y ');

  return (
    <li className="p-4 sm:p-5 flex items-start gap-3.5 sm:gap-4 hover:bg-panel-soft/25 transition-colors group">
      <div
        className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center transition-transform group-hover:scale-105 ${
          isVoided
            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            : isStamp
              ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
        }`}
        aria-hidden="true"
      >
        {isVoided ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : isStamp ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V4a2 2 0 112 2h-2zm0 0V4a2 2 0 10-2 2h2m0 0v13m-6-5h12a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2v4a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <p className={`font-bold text-sm sm:text-base truncate ${isVoided ? 'line-through text-panel-muted' : 'text-panel-text'}`}>
              {isStamp ? quantities || 'Carga' : `Canje: ${entry.rewardName ?? 'premio'}`}
            </p>
            {isVoided && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                Anulado
              </span>
            )}
          </div>

          {entry.purchaseAmount !== null && (
            <span className={`text-sm sm:text-base font-extrabold tabular-nums shrink-0 ${isVoided ? 'line-through text-panel-muted' : 'text-panel-text'}`}>
              {clp.format(entry.purchaseAmount)}
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-panel-muted flex flex-wrap items-center gap-1.5 min-w-0">
            <time dateTime={entry.createdAt} className="tabular-nums font-medium">
              {formatDateTime(entry.createdAt)}
            </time>
            {entry.staffEmail && (
              <>
                <span>·</span>
                <span>Atendido por {entry.staffEmail}</span>
              </>
            )}
            {!isStamp && quantities && (
              <>
                <span>·</span>
                <span>{quantities} usados</span>
              </>
            )}
          </p>

          {(entry.receiptUrl || (onVoid && isStamp && !isVoided)) && (
            <div className="flex items-center gap-2 shrink-0">
              {entry.receiptUrl && (
                <a
                  href={entry.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-7 h-7 rounded-lg overflow-hidden border border-panel-border shrink-0 hover:ring-2 hover:ring-panel-accent transition-all shadow-2xs"
                  title="Ver foto de la boleta"
                >
                  <img src={entry.receiptUrl} alt="Foto de la boleta" className="w-full h-full object-cover" />
                </a>
              )}

              {onVoid && isStamp && !isVoided && (
                <button
                  type="button"
                  onClick={() => onVoid(entry)}
                  className="px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 rounded-lg transition-all shadow-2xs cursor-pointer"
                  title="Anular esta carga"
                >
                  Anular
                </button>
              )}
            </div>
          )}
        </div>

        {entry.note && (
          <p className="mt-2 text-xs sm:text-sm text-panel-text italic bg-panel-soft/60 px-3 py-1.5 rounded-xl border border-panel-border/50 inline-block">
            “{entry.note}”
          </p>
        )}

        {isVoided && (
          <div className="mt-2 p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300">
            <span className="font-bold">Motivo de anulación:</span> {entry.voidReason || 'Sin motivo especificado'}
          </div>
        )}
      </div>
    </li>
  );
}

type TimelineFilter = 'ALL' | 'PURCHASES' | 'REWARDS' | 'RECEIPTS';

/** Ficha del cliente y su historial de compras: la usan el panel del dueño y el panel interno. */
export function PurchaseHistory({
  data,
  onPage,
  onVoid,
  className = '',
}: {
  data: CustomerHistoryDto;
  onPage: (page: number) => void;
  onVoid?: (entry: PurchaseHistoryEntryDto) => void;
  className?: string;
}) {
  const { customer, totals, history } = data;
  const pages = Math.max(1, Math.ceil(history.total / history.pageSize));
  const [filter, setFilter] = useState<TimelineFilter>('ALL');

  // Cálculos de comportamiento e insights para el dueño
  const avgTicket = totals.visits > 0 ? Math.round(totals.purchaseAmount / totals.visits) : 0;

  const activityStatus = useMemo(() => {
    if (totals.visits === 0) {
      return { title: 'Nuevo', subtext: 'Aún no registra compras' };
    }
    const lastActive = history.items.find((i) => !i.voidedAt);
    if (!lastActive) {
      return { title: 'Regular', subtext: 'Sin visitas recientes' };
    }
    const days = Math.max(0, Math.floor((Date.now() - new Date(lastActive.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
    if (days === 0) return { title: 'Activo hoy', subtext: 'Vino hoy' };
    if (days === 1) return { title: 'Activo ayer', subtext: 'Vino ayer' };
    if (days <= 14) return { title: 'Al día', subtext: `Última visita: hace ${days}d` };
    if (days <= 30) return { title: 'Enfriándose', subtext: `Hace ${days}d sin venir` };
    return { title: 'En riesgo', subtext: `Hace ${days}d sin venir` };
  }, [totals.visits, history.items]);

  const isStampsActive = data.stampsEnabled ?? data.cardType !== 'POINTS';

  const countPurchases = useMemo(() => history.items.filter((i) => i.type === 'STAMP_ADDED' && i.purchaseAmount !== null).length, [history.items]);
  const countRewards = useMemo(() => history.items.filter((i) => i.type === 'REWARD_REDEEMED').length, [history.items]);
  const countReceipts = useMemo(() => history.items.filter((i) => Boolean(i.receiptUrl)).length, [history.items]);

  const filteredItems = useMemo(() => {
    if (filter === 'PURCHASES') return history.items.filter((i) => i.type === 'STAMP_ADDED' && i.purchaseAmount !== null);
    if (filter === 'REWARDS') return history.items.filter((i) => i.type === 'REWARD_REDEEMED');
    if (filter === 'RECEIPTS') return history.items.filter((i) => Boolean(i.receiptUrl));
    return history.items;
  }, [history.items, filter]);

  return (
    <div className={`space-y-6 ${className}`}>
      <section aria-label="Datos del cliente" className={`${CARD} p-5 sm:p-6`}>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field label="Nombre" value={customer.name} />
          <Field label="Correo" value={customer.email} />
          <Field label="Teléfono" value={customer.phone} />
          <Field label="RUT" value={customer.rut} />
          <Field label="Cumpleaños" value={formatBirthday(customer.birthDay, customer.birthMonth, customer.birthYear)} />
          <Field label="Cliente desde" value={formatDate(customer.joinedAt)} />
        </dl>
      </section>

      {/* 2. Métricas de Comportamiento y Totales del Cliente */}
      <section aria-label="Totales" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {isStampsActive && (
          <Stat label="Sellos vigentes" value={String(customer.activeStamps)} subtext="En billetera" />
        )}
        {(data.pointsEnabled ?? data.cardType === 'POINTS') && (
          <Stat label="Puntos vigentes" value={String(customer.activePoints ?? 0)} subtext="En billetera" />
        )}
        <Stat label="Visitas" value={String(totals.visits)} subtext="Cargas totales" />
        <Stat label="Canjes" value={String(totals.redemptions)} subtext="Premios dados" />
        <Stat label="Compras registradas" value={clp.format(totals.purchaseAmount)} subtext="Venta acumulada" />
        <Stat label="Ticket promedio" value={avgTicket > 0 ? clp.format(avgTicket) : '—'} subtext="Gasto por visita" />
        <Stat label="Actividad" value={activityStatus.title} subtext={activityStatus.subtext} />
      </section>

      {/* 3. Feed de Compras y Movimientos con Filtros Integrados */}
      <section aria-labelledby="purchase-history-title" className={CARD}>
        <div className="p-4 sm:p-5 border-b border-panel-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 id="purchase-history-title" className="text-lg font-extrabold text-panel-text tracking-tight">
            Historial de compras
          </h2>

          {/* Segmented Control de Filtros */}
          {history.items.length > 0 && (
            <SegmentedTabs<TimelineFilter>
              value={filter}
              onChange={setFilter}
              variant="soft"
              size="sm"
              role="tablist"
              ariaLabel="Filtros del historial"
              className="border border-panel-border/50 self-start sm:self-auto"
              options={[
                { value: 'ALL', label: 'Todos', count: history.items.length },
                ...(countPurchases > 0 ? [{ value: 'PURCHASES' as const, label: 'Compras', count: countPurchases }] : []),
                ...(countRewards > 0 ? [{ value: 'REWARDS' as const, label: 'Canjes', count: countRewards }] : []),
                ...(countReceipts > 0 ? [{ value: 'RECEIPTS' as const, label: 'Con boleta', count: countReceipts }] : []),
              ]}
            />
          )}
        </div>

        {filteredItems.length === 0 ? (
          <EmptyState
            variant="simple"
            title={
              history.items.length === 0
                ? `Todavía no tiene ${balanceUnit(data.cardType)} ni canjes.`
                : 'No hay movimientos que coincidan con el filtro seleccionado.'
            }
            className="p-8"
          />
        ) : (
          <ol className="divide-y divide-panel-border/60">
            {filteredItems.map((entry) => (
              <EntryRow key={entry.id} entry={entry} onVoid={onVoid} />
            ))}
          </ol>
        )}

        <Pagination
            currentPage={history.page}
            totalPages={pages}
            variant="simple"
            onPageChange={onPage}
          />
      </section>
    </div>
  );
}
