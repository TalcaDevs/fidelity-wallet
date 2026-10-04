import { useCallback, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PurchaseHistory } from '../../components/customers/PurchaseHistory';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { useAsyncData } from '../../hooks/useAsyncData';
import { getInternalCustomerHistory } from '../../services/internalService';
import { Empty, PageHeader, SECONDARY } from './ui';

/** Solo SUPERADMIN: identificadores enmascarados y cada consulta queda en la auditoría. */
export function InternalCustomerHistory() {
  const { customerId } = useParams<{ customerId: string }>();
  const [params] = useSearchParams();
  const brandId = params.get('brandId');
  const [page, setPage] = useState(1);

  const fetcher = useCallback(
    () => getInternalCustomerHistory(customerId!, brandId!, page),
    [customerId, brandId, page],
  );
  const { data, loading, error } = useAsyncData(customerId && brandId ? fetcher : null);

  return (
    <div>
      <PageHeader
        title={data?.customer.name ?? 'Historial del cliente'}
        subtitle="Compras validadas en caja. Esta consulta queda registrada en la auditoría."
        actions={<Link to="/internal/customers" className={SECONDARY}>← Clientes</Link>}
      />
      {!brandId ? (
        <Empty>Entra desde la lista de clientes, en la tarjeta de una marca.</Empty>
      ) : (
        <>
          {error && <ErrorAlert message={error} />}
          {loading && !data ? (
            <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse" aria-busy="true" />
          ) : (
            data && <PurchaseHistory data={data} onPage={setPage} />
          )}
        </>
      )}
    </div>
  );
}
