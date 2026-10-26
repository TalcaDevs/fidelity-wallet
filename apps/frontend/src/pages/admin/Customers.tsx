import { PanelTitle } from '../../components/admin/PanelTitle';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCustomers, deleteCustomer, type CustomerRow } from '../../services/customersService';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { maskIdentifier } from '../../lib/maskIdentifier';
import { formatStampExpiry } from '../../lib/stampExpiry';
import { downloadCsv, toCsv, type CsvColumn } from '../../lib/csv';
import { useToast } from '../../hooks/useToast';
import { customerDetailPath } from '../../components/routing/routePaths';
import { formatBirthday } from '../../lib/formatDate';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
const PAGE_SIZE = 10;
const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export type CustomerFilter = 'all' | 'frequent' | 'new' | 'inactive';

export function getCustomerStatus(row: CustomerRow, now: Date): {
  key: 'new' | 'frequent' | 'inactive' | 'regular';
  label: string;
  badgeClass: string;
} {
  const joinedDays = (now.getTime() - new Date(row.joinedAt).getTime()) / 86400000;
  if (joinedDays <= 7) {
    return {
      key: 'new',
      label: 'Nuevo',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    };
  }

  const inactiveDays = (now.getTime() - new Date(row.lastActivityAt).getTime()) / 86400000;
  if (inactiveDays >= 30) {
    return {
      key: 'inactive',
      label: 'Inactivo',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    };
  }

  const isFrequent = row.activeStamps >= 5 || (row.activePoints ?? 0) >= 50;
  if (isFrequent) {
    return {
      key: 'frequent',
      label: 'Frecuente',
      badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    };
  }

  return {
    key: 'regular',
    label: 'Al día',
    badgeClass: 'bg-panel-soft text-panel-muted',
  };
}

// La exportación lleva el dato completo: es la base de datos del comercio y el
// dueño la está pidiendo explícitamente. En pantalla se muestra enmascarado.
const CSV_COLUMNS: CsvColumn<CustomerRow>[] = [
  { header: 'Nombre', value: (row) => row.name ?? null },
  { header: 'Correo', value: (row) => row.email ?? null },
  { header: 'RUT', value: (row) => row.rut },
  { header: 'Teléfono', value: (row) => row.phone },
  { header: 'Cumpleaños', value: (row) => formatBirthday(row.birthDay, row.birthMonth, row.birthYear) },
  { header: 'Sellos vigentes', value: (row) => row.stampsEnabled === false ? '' : row.activeStamps },
  { header: 'Puntos vigentes', value: (row) => row.pointsEnabled ? (row.activePoints ?? 0) : '' },
  { header: 'Próximo vencimiento', value: (row) => (row.nextExpiryAt ? new Date(row.nextExpiryAt).toISOString() : null) },
  { header: 'Compras registradas ($)', value: (row) => row.totalPurchases ?? 0 },
  { header: 'Cantidad de compras', value: (row) => row.purchasesCount ?? 0 },
  { header: 'Cliente desde', value: (row) => new Date(row.joinedAt).toISOString() },
  { header: 'Última actividad', value: (row) => new Date(row.lastActivityAt).toISOString() },
];

export function Customers({ brandId, merchantId }: { brandId: string | null; merchantId: string | null }) {
  const { notifySuccess, notifyError } = useToast();

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerFilter>('all');
  const [page, setPage] = useState(1);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomers = useCallback(async (id: string) => {
    setLoading(true);
    try {
      setCustomers(await listCustomers(id));
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('No pudimos cargar tus clientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConfirmDelete = async () => {
    if (!brandId || !merchantId || !customerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(merchantId, customerToDelete.customerId);
      notifySuccess('Datos del cliente eliminados exitosamente (Ley 19.628).');
      setCustomerToDelete(null);
      fetchCustomers(brandId);
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : 'No se pudo eliminar al cliente.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (brandId) fetchCustomers(brandId);
  }, [brandId, fetchCustomers]);

  // Un único "ahora" para todo el render: si cada fila creara el suyo, dos filas
  // con la misma fecha podrían quedar con textos distintos al cruzar la medianoche.
  const now = useMemo(() => new Date(), []);

  const counts = useMemo(() => {
    let frequent = 0;
    let newCust = 0;
    let inactive = 0;
    for (const c of customers) {
      const st = getCustomerStatus(c, now);
      if (st.key === 'new') newCust++;
      else if (st.key === 'frequent') frequent++;
      else if (st.key === 'inactive') inactive++;
    }
    return { all: customers.length, frequent, new: newCust, inactive };
  }, [customers, now]);

  const purchaseMetrics = useMemo(() => {
    let totalPurchases = 0;
    let totalPurchasesCount = 0;
    let customersWithPurchases = 0;

    for (const c of customers) {
      const amount = c.totalPurchases ?? 0;
      const count = c.purchasesCount ?? 0;
      totalPurchases += amount;
      totalPurchasesCount += count;
      if (amount > 0) customersWithPurchases++;
    }

    const averageTicket = totalPurchasesCount > 0 ? Math.round(totalPurchases / totalPurchasesCount) : 0;
    return { totalPurchases, totalPurchasesCount, customersWithPurchases, averageTicket };
  }, [customers]);

  const term = search.trim().toLowerCase();
  const visible = useMemo(() => {
    return customers.filter((row) => {
      const matchesSearch =
        !term ||
        [row.name, row.email, row.rut, row.phone].some((value) =>
          (value ?? '').toLowerCase().includes(term),
        );
      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      const st = getCustomerStatus(row, now);
      return st.key === statusFilter;
    });
  }, [customers, term, statusFilter, now]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return visible.slice(startIndex, startIndex + PAGE_SIZE);
  }, [visible, currentPage]);

  const handleExport = () => {
    if (customers.length === 0) {
      notifyError('Todavía no tienes clientes para exportar.');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`clientes-${stamp}.csv`, toCsv(customers, CSV_COLUMNS));
    notifySuccess(`Exportamos ${customers.length} cliente(s) a CSV.`);
  };

  const getEmptyMessage = () => {
    if (customers.length === 0) {
      return {
        title: 'Aún no tienes clientes registrados.',
        subtitle: 'Aparecerán aquí en cuanto empiecen a guardar su tarjeta.',
      };
    }
    if (statusFilter !== 'all') {
      return {
        title: 'No hay clientes con este filtro.',
        subtitle: 'Prueba seleccionando "Todos" o cambiando el término de búsqueda.',
      };
    }
    return {
      title: 'Ningún cliente coincide con tu búsqueda.',
      subtitle: 'Prueba con otro nombre, correo, RUT o teléfono.',
    };
  };

  const renderTableRows = () => {
    if (loading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <tr key={i}>
          <td colSpan={6} className="p-5">
            <Skeleton className="h-12 rounded-2xl" />
          </td>
        </tr>
      ));
    }

    if (visible.length === 0) {
      const empty = getEmptyMessage();
      return (
        <tr>
          <td colSpan={6} className="p-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-panel-soft text-panel-muted mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-lg font-bold text-panel-muted">{empty.title}</p>
            <p className="text-panel-muted mt-1">{empty.subtitle}</p>
          </td>
        </tr>
      );
    }

    return pagedCustomers.map((row) => {
      const expiryLabel = formatStampExpiry(row.nextExpiryAt, now);
      const status = getCustomerStatus(row, now);
      const displayName =
        row.name ??
        maskIdentifier(row.rut) ??
        maskIdentifier(row.phone) ??
        maskIdentifier(row.email) ??
        'Anónimo';
      const secondaryIdentifier = row.name
        ? maskIdentifier(row.phone) ?? maskIdentifier(row.email) ?? maskIdentifier(row.rut)
        : null;

      return (
        <tr key={row.passId} className="hover:bg-panel-soft transition-colors">
          <td className="p-4 sm:p-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={customerDetailPath(row.customerId)}
                className="font-bold text-panel-text hover:text-panel-accent hover:underline"
              >
                {displayName}
              </Link>
              {status.key !== 'regular' && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${status.badgeClass}`}
                >
                  {status.label}
                </span>
              )}
            </div>
            {secondaryIdentifier && (
              <span className="block text-sm text-panel-muted font-medium mt-0.5">
                {secondaryIdentifier}
              </span>
            )}
          </td>
          <td className="p-4 sm:p-5 whitespace-nowrap">
            <div className="flex flex-col items-start gap-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-panel-accent/10 dark:bg-panel-accent/20 text-panel-accent font-bold text-xs sm:text-sm whitespace-nowrap">
                {row.stampsEnabled !== false && (
                  <span className="whitespace-nowrap">
                    {row.activeStamps} {row.activeStamps === 1 ? 'sello' : 'sellos'}
                  </span>
                )}
                {row.pointsEnabled && (
                  <span className="whitespace-nowrap">
                    {row.stampsEnabled !== false ? '· ' : ''}{row.activePoints ?? 0} {row.activePoints === 1 ? 'punto' : 'puntos'}
                  </span>
                )}
              </span>
              {/* Si la promoción no vence, no mostramos nada: un guion o un "null" solo confunde. */}
              {expiryLabel && (
                <span className="block text-xs text-panel-muted font-medium mt-0.5">
                  {expiryLabel}
                </span>
              )}
            </div>
          </td>
          <td className="p-4 sm:p-5 whitespace-nowrap">
            <div className="font-extrabold text-panel-text tabular-nums text-xs sm:text-sm">
              {(row.totalPurchases ?? 0) > 0 ? clp.format(row.totalPurchases!) : '—'}
            </div>
            {(row.purchasesCount ?? 0) > 0 && (
              <span className="block text-[11px] text-panel-muted font-medium mt-0.5">
                {row.purchasesCount} {row.purchasesCount === 1 ? 'compra' : 'compras'}
              </span>
            )}
          </td>
          <td className="p-4 sm:p-5 text-panel-muted font-medium text-xs sm:text-sm whitespace-nowrap">
            {new Date(row.joinedAt).toLocaleDateString([], DATE_FORMAT)}
          </td>
          <td className="p-4 sm:p-5 text-panel-muted font-medium text-xs sm:text-sm whitespace-nowrap">
            {new Date(row.lastActivityAt).toLocaleDateString([], DATE_FORMAT)}
          </td>
          <td className="p-4 sm:p-5 text-right whitespace-nowrap">
            <Link
              to={customerDetailPath(row.customerId)}
              className="mr-2 px-3 py-1.5 text-panel-accent bg-panel-accent/10 hover:bg-panel-accent/20 rounded-xl transition-all inline-flex items-center text-xs font-semibold"
            >
              Historial
            </Link>
            <button
              type="button"
              onClick={() => setCustomerToDelete(row)}
              title="Eliminar datos personales (Ley 19.628)"
              className="px-3 py-1.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100/80 dark:bg-red-950/40 dark:hover:bg-red-900/40 border border-red-200/60 dark:border-red-900/60 rounded-xl transition-all inline-flex items-center gap-1.5 text-xs font-semibold shadow-xs"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Eliminar</span>
            </button>
          </td>
        </tr>
      );
    });
  };

  return (
    <>
      <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-panel-text"><PanelTitle text="Clientes" /></h1>
          <p className="text-panel-muted text-sm sm:text-base">Tu base de datos: quién vuelve y cuántos sellos lleva.</p>
        </div>
        <button
          onClick={handleExport}
          className="px-6 py-3 bg-panel-primary hover:bg-panel-primary/90 text-white shadow-lg shadow-brand-blue/20 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Exportar CSV
        </button>
      </header>

      {error && <ErrorAlert message={error} />}

      {/* Tarjetas resumen de clientes y compras registradas */}
      {!loading && customers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" aria-label="Resumen de clientes y compras">
          <div className="bg-panel-surface p-5 rounded-2xl border border-panel-border shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-panel-muted">Total Clientes</span>
              <span className="text-lg">👥</span>
            </div>
            <div className="text-2xl font-extrabold text-panel-text tabular-nums">
              {counts.all}
            </div>
            <p className="text-xs text-panel-muted mt-1">
              {counts.frequent} frecuentes · {counts.new} nuevos
            </p>
          </div>

          <div className="bg-panel-surface p-5 rounded-2xl border border-panel-border shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-panel-muted">Compras Registradas</span>
              <span className="text-lg">💰</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {clp.format(purchaseMetrics.totalPurchases)}
            </div>
            <p className="text-xs text-panel-muted mt-1">
              {purchaseMetrics.customersWithPurchases} {purchaseMetrics.customersWithPurchases === 1 ? 'cliente con compras' : 'clientes con compras'}
            </p>
          </div>

          <div className="bg-panel-surface p-5 rounded-2xl border border-panel-border shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-panel-muted">Ticket Promedio</span>
              <span className="text-lg">🧾</span>
            </div>
            <div className="text-2xl font-extrabold text-panel-text tabular-nums">
              {purchaseMetrics.averageTicket > 0 ? clp.format(purchaseMetrics.averageTicket) : '—'}
            </div>
            <p className="text-xs text-panel-muted mt-1">
              Por compra registrada en caja
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="w-full md:max-w-sm">
          <label htmlFor="customer-search" className="sr-only">Buscar por nombre, correo, RUT o teléfono</label>
          <input
            id="customer-search"
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre, correo, RUT o teléfono..."
            className="w-full px-5 py-3 bg-panel-surface rounded-2xl border border-panel-border focus:outline-none focus:ring-4 focus:ring-panel-accent/20 focus:border-panel-accent transition-all text-panel-text font-medium text-sm"
          />
        </div>

        {/* Filtros por estado / frecuencia */}
        <div className="inline-flex items-center bg-panel-surface border border-panel-border p-1 rounded-2xl self-start md:self-auto gap-1 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
              statusFilter === 'all'
                ? 'bg-panel-primary text-white shadow-xs'
                : 'text-panel-muted hover:text-panel-text'
            }`}
          >
            Todos ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('frequent');
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
              statusFilter === 'frequent'
                ? 'bg-panel-primary text-white shadow-xs'
                : 'text-panel-muted hover:text-panel-text'
            }`}
          >
            ⭐ Frecuentes ({counts.frequent})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('new');
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
              statusFilter === 'new'
                ? 'bg-panel-primary text-white shadow-xs'
                : 'text-panel-muted hover:text-panel-text'
            }`}
          >
            🟢 Nuevos ({counts.new})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('inactive');
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
              statusFilter === 'inactive'
                ? 'bg-panel-primary text-white shadow-xs'
                : 'text-panel-muted hover:text-panel-text'
            }`}
          >
            💤 Inactivos ({counts.inactive})
          </button>
        </div>
      </div>

      <div data-panel-reveal className="bg-panel-surface rounded-2xl border border-panel-border shadow-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-panel-soft border-b border-panel-border backdrop-blur-sm">
                <th className="px-4 py-3.5 sm:px-6 sm:py-4 text-xs sm:text-sm font-bold text-panel-muted uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3.5 sm:px-6 sm:py-4 text-xs sm:text-sm font-bold text-panel-muted uppercase tracking-wider whitespace-nowrap">Saldo vigente</th>
                <th className="px-4 py-3.5 sm:px-6 sm:py-4 text-xs sm:text-sm font-bold text-panel-muted uppercase tracking-wider whitespace-nowrap">Compras registradas</th>
                <th className="px-4 py-3.5 sm:px-6 sm:py-4 text-xs sm:text-sm font-bold text-panel-muted uppercase tracking-wider whitespace-nowrap">Cliente desde</th>
                <th className="px-4 py-3.5 sm:px-6 sm:py-4 text-xs sm:text-sm font-bold text-panel-muted uppercase tracking-wider whitespace-nowrap">Última actividad</th>
                <th className="px-4 py-3.5 sm:px-6 sm:py-4 text-xs sm:text-sm font-bold text-panel-muted uppercase tracking-wider text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel-border">
              {renderTableRows()}
            </tbody>
          </table>
        </div>

        {/* Pasar página (Paginación) */}
        {!loading && visible.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-panel-soft/60 border-t border-panel-border">
            <p className="text-xs text-panel-muted font-medium text-center sm:text-left">
              Mostrando <span className="font-semibold text-panel-text">{(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, visible.length)}</span> de <span className="font-semibold text-panel-text">{visible.length}</span> clientes
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Página anterior de clientes"
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-panel-border bg-panel-surface text-panel-text hover:bg-panel-soft disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Anterior</span>
              </button>
              <span className="text-xs font-semibold text-panel-muted px-2">
                Página <strong className="text-panel-text">{currentPage}</strong> de <strong className="text-panel-text">{totalPages}</strong>
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Página siguiente de clientes"
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-panel-border bg-panel-surface text-panel-text hover:bg-panel-soft disabled:opacity-40 disabled:cursor-not-allowed transition-all inline-flex items-center gap-1 shadow-2xs"
              >
                <span>Siguiente</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {customerToDelete && (
        <ConfirmDialog trapFocus
          title="¿Eliminar datos de este cliente?"
          message={`¿Estás seguro de que deseas eliminar permanentemente a este cliente (${
            customerToDelete.name ?? maskIdentifier(customerToDelete.rut) ?? maskIdentifier(customerToDelete.phone) ?? maskIdentifier(customerToDelete.email) ?? 'Anónimo'
          }, con ${customerToDelete.activeStamps} sello(s) vigente(s))? En cumplimiento de la Ley 19.628 (cancelación de datos personales), se eliminarán de forma definitiva su pase, sus sellos acumulados y su historial en este local. Si no tiene tarjetas en otros comercios, sus datos personales serán borrados por completo. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar definitivamente"
          cancelLabel="Cancelar"
          tone="danger"
          isBusy={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => !isDeleting && setCustomerToDelete(null)}
        />
      )}
    </>
  );
}
