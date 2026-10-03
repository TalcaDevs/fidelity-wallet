import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PurchaseHistory } from '../../components/customers/PurchaseHistory';
import { ROUTES } from '../../components/routing/routePaths';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { useAsyncData } from '../../hooks/useAsyncData';
import { getCustomerHistory } from '../../services/customersService';

/** Ficha del cliente con su historial de compras en la marca (solo el dueño). */
export function CustomerDetail({ brandId }: { brandId: string | null }) {
  const { customerId } = useParams<{ customerId: string }>();
  const [page, setPage] = useState(1);

  const fetcher = useCallback(
    () => getCustomerHistory(customerId!, brandId!, page),
    [customerId, brandId, page],
  );
  const { data, loading, error } = useAsyncData(customerId && brandId ? fetcher : null);

  return (
    <>
      <Link to={ROUTES.customers} className="inline-block mb-6 text-sm font-bold text-brand-blue hover:underline">
        ← Clientes
      </Link>
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          {data?.customer.name ?? 'Cliente'}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          Sus compras validadas en caja, con el monto, la nota y la foto de la boleta cuando se registraron.
        </p>
      </header>

      {error && <ErrorAlert message={error} />}

      {loading && !data ? (
        <div className="space-y-4" aria-busy="true">
          <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>
      ) : (
        data && <PurchaseHistory data={data} onPage={setPage} />
      )}
    </>
  );
}
