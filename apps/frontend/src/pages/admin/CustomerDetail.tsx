import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { balanceUnit, type PanelStampsResultDto } from '@fidelity/shared';
import { PurchaseHistory } from '../../components/customers/PurchaseHistory';
import { ROUTES } from '../../components/routing/routePaths';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useToast } from '../../hooks/useToast';
import { getCustomerHistory } from '../../services/customersService';
import { AddStampsModal } from './components/customers/AddStampsModal';

/** Ficha del cliente con su historial de compras en la marca (solo el dueño). */
export function CustomerDetail({ brandId }: { brandId: string | null }) {
  const { customerId } = useParams<{ customerId: string }>();
  const { notifySuccess } = useToast();
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);

  const fetcher = useCallback(
    () => getCustomerHistory(customerId!, brandId!, page),
    [customerId, brandId, page],
  );
  const { data, loading, error, reload } = useAsyncData(customerId && brandId ? fetcher : null);
  const customerName = data?.customer.name ?? 'Cliente';

  const handleAdded = (result: PanelStampsResultDto) => {
    setAdding(false);
    const currency = result.currency ?? data?.cardType ?? 'STAMPS';
    const added = currency === 'POINTS' ? (result.pointsAdded ?? 0) : result.stampsAdded;
    const balance = currency === 'POINTS' ? (result.activePoints ?? 0) : result.activeStamps;
    notifySuccess(
      `Sumamos ${added} ${balanceUnit(currency, added)}. Ahora tiene ${balance}.` +
        (result.rewardUnlocked ? ' Ya puede canjear un premio.' : ''),
    );
    // La carga nueva queda arriba en el historial: se vuelve a la primera página.
    if (page === 1) reload();
    else setPage(1);
  };

  return (
    <>
      <Link to={ROUTES.customers} className="inline-block mb-6 text-sm font-bold text-panel-accent hover:underline">
        ← Clientes
      </Link>
      <header className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl sm:text-3xl font-extrabold tracking-tight text-panel-text">{customerName}</h1>
          <p className="text-panel-muted text-sm sm:text-base">
            Sus compras validadas en caja, con el monto, la nota y la foto de la boleta cuando se registraron.
          </p>
        </div>
        {data && brandId && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="shrink-0 px-6 py-3 bg-panel-primary hover:bg-panel-primary/90 text-white shadow-lg shadow-brand-blue/20 rounded-xl font-bold transition-all inline-flex items-center justify-center gap-2"
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14m-7-7h14" />
            </svg>
            Sumar {data.stampsEnabled && data.pointsEnabled ? 'sellos o puntos' : balanceUnit(data.cardType)}
          </button>
        )}
      </header>

      {error && <ErrorAlert message={error} />}

      {loading && !data ? (
        <div className="space-y-4" aria-busy="true">
          <div className="h-32 rounded-2xl bg-panel-soft animate-pulse" />
          <div className="h-64 rounded-2xl bg-panel-soft animate-pulse" />
        </div>
      ) : (
        data && <PurchaseHistory
          data={data}
          onPage={setPage}
          className="[&_section]:bg-panel-surface [&_section]:border-panel-border [&_section]:shadow-panel [&_[aria-label=Totales]>div]:bg-panel-surface [&_[aria-label=Totales]>div]:border-panel-border [&_dt]:text-panel-muted [&_dd]:text-panel-text [&_h2]:text-panel-text [&_p]:text-panel-muted [&_p.font-bold]:text-panel-text [&_p.font-black]:text-panel-text [&_time]:text-panel-muted [&_button]:bg-panel-soft [&_button]:text-panel-text [&_ol]:divide-panel-border"
        />
      )}

      {adding && data && brandId && customerId && (
        <AddStampsModal
          brandId={brandId}
          customerId={customerId}
          customerName={customerName}
          homeLocationId={data.customer.homeLocationId}
          cardType={data.cardType}
          maxStampsPerLoad={data.maxStampsPerLoad}
          maxPointsPerLoad={data.maxPointsPerLoad}
          stampsEnabled={data.stampsEnabled}
          pointsEnabled={data.pointsEnabled}
          onClose={() => setAdding(false)}
          onAdded={handleAdded}
        />
      )}
    </>
  );
}
