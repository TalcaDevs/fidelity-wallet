import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { CATALOG_PLANS } from '@fidelity/shared';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { useAsyncData } from '../../hooks/useAsyncData';
import { formatDate } from '../../lib/formatDate';
import { listBrands } from '../../services/internalService';
import { BrandStatusBadge, CARD, Empty, INPUT, PageHeader, Pager, PlanBadge, SECONDARY } from './ui';

export function InternalBrands() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [planId, setPlanId] = useState('');
  const [page, setPage] = useState(1);

  const fetcher = useCallback(() => listBrands({ q: search, status, planId, page }), [search, status, planId, page]);
  const { data, loading, error } = useAsyncData(fetcher);
  const [now] = useState(() => Date.now());

  return (
    <div>
      <PageHeader title="Marcas" subtitle="Todos los comercios de la plataforma" />

      <div className="flex flex-wrap gap-2 mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q.trim());
            setPage(1);
          }}
          className="flex gap-2"
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o slug de un local" className={INPUT} />
          <button type="submit" className={SECONDARY}>Buscar</button>
        </form>
        <select aria-label="Estado" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={INPUT}>
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activas</option>
          <option value="SUSPENDED">Suspendidas</option>
        </select>
        <select aria-label="Plan" value={planId} onChange={(e) => { setPlanId(e.target.value); setPage(1); }} className={INPUT}>
          <option value="">Todos los planes</option>
          {CATALOG_PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-left text-sm min-w-[860px]">
          <thead className="text-panel-muted border-b border-panel-border">
            <tr>
              <th className="p-4 font-bold">Marca</th>
              <th className="p-4 font-bold">Plan</th>
              <th className="p-4 font-bold">Estado</th>
              <th className="p-4 font-bold text-right">Locales</th>
              <th className="p-4 font-bold text-right">Clientes</th>
              <th className="p-4 font-bold text-right">Tickets abiertos</th>
              <th className="p-4 font-bold whitespace-nowrap">Último escaneo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-panel-border">
            {loading && !data ? (
              <tr><td colSpan={7} className="p-6"><div className="h-24 animate-pulse bg-panel-soft rounded-xl" /></td></tr>
            ) : data && data.items.length > 0 ? (
              data.items.map((b) => {
                const trialOver = b.planId === 'TRIAL' && new Date(b.trialEndsAt).getTime() < now;
                return (
                  <tr key={b.id} className="hover:bg-panel-soft">
                    <td className="p-4">
                      <Link to={`/internal/brands/${b.id}`} className="font-bold text-panel-accent hover:underline">{b.name}</Link>
                      <p className="text-xs text-panel-muted">{b.ownerEmail ?? 'Sin dueño'} · alta {formatDate(b.createdAt)}</p>
                    </td>
                    <td className="p-4">
                      <PlanBadge planId={b.planId} />
                      {trialOver && <p className="text-xs font-bold text-panel-orange mt-1">Prueba vencida</p>}
                    </td>
                    <td className="p-4"><BrandStatusBadge status={b.status} /></td>
                    <td className="p-4 text-right">{b.locations}</td>
                    <td className="p-4 text-right">{b.customers}</td>
                    <td className={`p-4 text-right font-bold ${b.openTickets > 0 ? 'text-panel-orange' : 'text-panel-muted'}`}>{b.openTickets}</td>
                    <td className="p-4 whitespace-nowrap text-panel-muted">{b.lastScanAt ? formatDate(b.lastScanAt) : 'Nunca'}</td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={7}><Empty>No hay marcas con esos filtros.</Empty></td></tr>
            )}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
    </div>
  );
}
