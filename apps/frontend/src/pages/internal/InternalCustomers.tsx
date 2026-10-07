import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { REVEAL_REASON_MIN, type InternalCustomerDto, type RevealedCustomerDto } from '@fidelity/shared';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Modal } from '../../components/ui/Modal';
import { errorMessage, useAsyncData } from '../../hooks/useAsyncData';
import { formatDate } from '../../lib/formatDate';
import { revealCustomer, searchCustomers } from '../../services/internalService';
import { useIsSuperadmin } from './internalRole';
import { CARD, Empty, INPUT, PRIMARY, PageHeader, Pager, SECONDARY } from './ui';

function RevealDialog({ customer, onClose }: { customer: InternalCustomerDto; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [revealed, setRevealed] = useState<RevealedCustomerDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleReveal() {
    setBusy(true);
    setError(null);
    try {
      setRevealed(await revealCustomer(customer.id, reason.trim()));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Ver datos completos"
      description="Es un dato personal (Ley 19.628). Tu nombre y el motivo quedan en la auditoría."
      onClose={onClose}
    >
      {revealed ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-panel-muted">RUT</dt>
          <dd className="font-mono font-bold">{revealed.rut ?? '—'}</dd>
          <dt className="text-panel-muted">Teléfono</dt>
          <dd className="font-mono font-bold">{revealed.phone ?? '—'}</dd>
        </dl>
      ) : (
        <div className="space-y-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className={`${INPUT} w-full`}
            placeholder="Motivo: por ejemplo, ticket #1024, el cliente no recibe su tarjeta"
          />
          {error && <ErrorAlert message={error} />}
          <div className="flex justify-end gap-2">
            <button type="button" className={SECONDARY} onClick={onClose}>Cancelar</button>
            <button type="button" className={PRIMARY} disabled={busy || reason.trim().length < REVEAL_REASON_MIN} onClick={() => void handleReveal()}>
              Ver datos
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function InternalCustomers() {
  const isSuperadmin = useIsSuperadmin();
  const [params] = useSearchParams();
  const brandId = params.get('brandId') ?? undefined;
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [revealing, setRevealing] = useState<InternalCustomerDto | null>(null);

  const canSearch = Boolean(search || brandId);
  const fetcher = useCallback(() => searchCustomers({ q: search || undefined, brandId, page }), [search, brandId, page]);
  const { data, loading, error } = useAsyncData(canSearch ? fetcher : null);

  return (
    <div>
      <PageHeader
        title="Clientes finales"
        subtitle={brandId ? 'Clientes de una marca' : 'Busca por RUT o teléfono completos: no hay búsqueda parcial de datos personales'}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
          setPage(1);
        }}
        className="flex flex-wrap gap-2 mb-4"
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="12.345.678-5 o +56912345678" className={INPUT} />
        <button type="submit" className={SECONDARY}>Buscar</button>
        {brandId && <Link to="/internal/customers" className={SECONDARY}>Quitar filtro de marca</Link>}
      </form>

      {error && <ErrorAlert message={error} />}

      {!canSearch ? (
        <Empty>Ingresa un RUT o teléfono, o entra desde el detalle de una marca.</Empty>
      ) : (
        <div className={`${CARD} overflow-x-auto`}>
          <table className="w-full text-left text-sm min-w-[720px]">
            <thead className="text-panel-muted border-b border-panel-border">
              <tr>
                <th className="p-4 font-bold">RUT</th>
                <th className="p-4 font-bold">Teléfono</th>
                <th className="p-4 font-bold">Tarjetas</th>
                <th className="p-4 font-bold whitespace-nowrap">Alta</th>
                {isSuperadmin && <th className="p-4" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-panel-border">
              {loading && !data ? (
                <tr><td colSpan={5} className="p-6"><div className="h-16 animate-pulse bg-panel-soft rounded-xl" /></td></tr>
              ) : data && data.items.length > 0 ? (
                data.items.map((c) => (
                  <tr key={c.id}>
                    <td className="p-4 font-mono">{c.rut ?? '—'}</td>
                    <td className="p-4 font-mono">{c.phone ?? '—'}</td>
                    <td className="p-4">
                      {c.cards.map((card) => (
                        <p key={card.brandId}>
                          <Link to={`/internal/brands/${card.brandId}`} className="font-bold text-panel-accent hover:underline">{card.brandName}</Link>
                          {card.stampsEnabled !== false && <span className="text-panel-muted"> · {card.activeStamps} sellos</span>}
                          {card.pointsEnabled && <span className="text-panel-muted"> · {card.activePoints ?? 0} puntos</span>}
                          {isSuperadmin && (
                            <>
                              {' · '}
                              <Link
                                to={`/internal/customers/${c.id}/history?brandId=${card.brandId}`}
                                className="font-bold text-panel-accent hover:underline"
                              >
                                Historial
                              </Link>
                            </>
                          )}
                        </p>
                      ))}
                    </td>
                    <td className="p-4 whitespace-nowrap text-panel-muted">{formatDate(c.createdAt)}</td>
                    {isSuperadmin && (
                      <td className="p-4 text-right">
                        <button type="button" className={SECONDARY} onClick={() => setRevealing(c)}>Ver datos</button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5}><Empty>Sin resultados.</Empty></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
      {revealing && <RevealDialog customer={revealing} onClose={() => setRevealing(null)} />}
    </div>
  );
}
