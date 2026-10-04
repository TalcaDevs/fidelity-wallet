import { balanceUnit, type CardType, type CustomerHistoryDto, type PurchaseHistoryEntryDto } from '@fidelity/shared';
import { formatBirthday, formatDate, formatDateTime } from '../../lib/formatDate';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const METHOD_LABELS: Record<PurchaseHistoryEntryDto['method'], string> = {
  QR: 'QR',
  MANUAL: 'búsqueda manual',
  PANEL: 'sumado desde el panel',
  WELCOME: 'bienvenida',
};

const CARD = 'bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70';

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100 break-words">{value ?? '—'}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${CARD} p-4`}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">{value}</p>
    </div>
  );
}

function EntryRow({ entry, cardType }: { entry: PurchaseHistoryEntryDto; cardType: CardType }) {
  const isStamp = entry.type === 'STAMP_ADDED';
  const unit = balanceUnit(cardType, entry.stamps);
  return (
    <li className="p-4 sm:p-5 flex gap-4">
      <span
        aria-hidden="true"
        className={`mt-1 w-2.5 h-2.5 shrink-0 rounded-full ${isStamp ? 'bg-brand-blue' : 'bg-green-500'}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="font-bold text-slate-900 dark:text-slate-100">
            {isStamp
              ? cardType === 'STAMPS' && entry.stamps === 1 ? 'Sello' : `${entry.stamps} ${unit}`
              : `Canje: ${entry.rewardName ?? 'premio'}`}
            {entry.purchaseAmount !== null && (
              <span className="ml-2 font-black tabular-nums">{clp.format(entry.purchaseAmount)}</span>
            )}
          </p>
          <time dateTime={entry.createdAt} className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {formatDateTime(entry.createdAt)}
          </time>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {entry.locationName}
          {entry.staffEmail && <> · {entry.staffEmail}</>}
          {' · '}
          {METHOD_LABELS[entry.method]}
          {!isStamp && <> · {entry.stamps} {unit} usados</>}
        </p>
        {entry.note && <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">“{entry.note}”</p>}
      </div>
      {entry.receiptUrl && (
        <a
          href={entry.receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 block w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700"
          title="Ver foto de la boleta"
        >
          <img src={entry.receiptUrl} alt="Foto de la boleta" className="w-full h-full object-cover" />
        </a>
      )}
    </li>
  );
}

/** Ficha del cliente y su historial de compras: la usan el panel del dueño y el panel interno. */
export function PurchaseHistory({
  data,
  onPage,
}: {
  data: CustomerHistoryDto;
  onPage: (page: number) => void;
}) {
  const { customer, totals, history } = data;
  const pages = Math.max(1, Math.ceil(history.total / history.pageSize));

  return (
    <div className="space-y-6">
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

      <section aria-label="Totales" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={`${data.cardType === 'POINTS' ? 'Puntos' : 'Sellos'} vigentes`} value={String(customer.activeStamps)} />
        <Stat label="Visitas" value={String(totals.visits)} />
        <Stat label="Canjes" value={String(totals.redemptions)} />
        <Stat label="Compras registradas" value={clp.format(totals.purchaseAmount)} />
      </section>

      <section aria-labelledby="purchase-history-title" className={CARD}>
        <h2 id="purchase-history-title" className="px-5 pt-5 text-lg font-black text-slate-900 dark:text-slate-100">
          Historial de compras
        </h2>
        {history.items.length === 0 ? (
          <p className="p-5 text-slate-500 dark:text-slate-400">Todavía no tiene {balanceUnit(data.cardType)} ni canjes.</p>
        ) : (
          <ol className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {history.items.map((entry) => <EntryRow key={entry.id} entry={entry} cardType={data.cardType} />)}
          </ol>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-700/60 text-sm">
            <button
              type="button"
              disabled={history.page <= 1}
              onClick={() => onPage(history.page - 1)}
              className="px-3 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-slate-500 dark:text-slate-400">Página {history.page} de {pages}</span>
            <button
              type="button"
              disabled={history.page >= pages}
              onClick={() => onPage(history.page + 1)}
              className="px-3 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
