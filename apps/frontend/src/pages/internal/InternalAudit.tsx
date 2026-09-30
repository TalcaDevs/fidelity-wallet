import { useCallback, useState } from 'react';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { useAsyncData } from '../../hooks/useAsyncData';
import { formatDateTime } from '../../lib/formatDate';
import { listAudit } from '../../services/internalService';
import { CARD, Empty, INPUT, PageHeader, Pager } from './ui';

const ENTITIES = [
  { value: '', label: 'Todo' },
  { value: 'Brand', label: 'Marcas' },
  { value: 'Merchant', label: 'Locales' },
  { value: 'Customer', label: 'Datos de clientes' },
  { value: 'Ticket', label: 'Tickets' },
  { value: 'BrandMember', label: 'Equipo' },
];

const formatChange = (value: unknown) =>
  value && typeof value === 'object'
    ? Object.entries(value as Record<string, unknown>).map(([k, v]) => `${k}: ${v === null ? '—' : String(v)}`).join(' · ')
    : '';

export function InternalAudit() {
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const fetcher = useCallback(() => listAudit({ entity: entity || undefined, page }), [entity, page]);
  const { data, loading, error } = useAsyncData(fetcher);

  return (
    <div>
      <PageHeader
        title="Auditoría"
        subtitle="Cambios del equipo interno y de los dueños, y cada vista de un dato personal completo"
        actions={
          <select aria-label="Entidad" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} className={INPUT}>
            {ENTITIES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        }
      />
      {error && <ErrorAlert message={error} />}
      <div className={`${CARD} divide-y divide-slate-100 dark:divide-slate-700/60`}>
        {loading && !data ? (
          <div className="p-6 h-24 animate-pulse" />
        ) : data && data.items.length > 0 ? (
          data.items.map((a) => (
            <div key={a.id} className="p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p><span className="font-bold">{a.action}</span> · {a.entity} <span className="text-slate-500 font-mono text-xs">{a.entityId}</span></p>
                <p className="text-slate-500 whitespace-nowrap">{formatDateTime(a.createdAt)}</p>
              </div>
              <p className="text-slate-500 mt-1">{a.actorEmail ?? a.actorUserId} ({a.actorType === 'PLATFORM' ? 'equipo interno' : 'dueño'})</p>
              {(a.before != null || a.after != null) && (
                <p className="mt-1 text-xs"><span className="text-slate-500">{formatChange(a.before)}</span> → <span className="font-bold">{formatChange(a.after)}</span></p>
              )}
              {a.reason && <p className="mt-1 text-xs italic">Motivo: {a.reason}</p>}
            </div>
          ))
        ) : (
          <Empty>No hay registros.</Empty>
        )}
      </div>
      {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
    </div>
  );
}
