import { PageHeader } from '../../components/layout/PageHeader';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCustomers, deleteCustomer, type CustomerRow } from '../../services/customersService';
import { listBrandLocations, type LocationOption } from '../../services/locationsService';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { Pagination } from '../../components/ui/Pagination';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { ArrowIcon } from '../../components/ui/ArrowIcon';
import { SearchInput } from '../../components/ui/SearchInput';
import { maskIdentifier } from '../../lib/maskIdentifier';
import { formatStampExpiry } from '../../lib/stampExpiry';
import { downloadCsv, toCsv, type CsvColumn } from '../../lib/csv';
import { formatBirthday } from '../../lib/formatDate';
import { useToast } from '../../hooks/useToast';
import { customerDetailPath } from '../../components/routing/routePaths';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
const PAGE_SIZE = 10;
const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export const getCsvColumns = (locationNameMap?: Map<string, string>): CsvColumn<CustomerRow>[] => [
  { header: 'Nombre', value: (row) => row.name ?? null },
  { header: 'Correo', value: (row) => row.email ?? null },
  { header: 'RUT', value: (row) => row.rut },
  { header: 'Teléfono', value: (row) => row.phone },
  ...(locationNameMap && locationNameMap.size > 1
    ? [
        {
          header: 'Sucursal de registro',
          value: (row: CustomerRow) => (row.merchantId ? locationNameMap.get(row.merchantId) ?? null : null),
        },
      ]
    : []),
  { header: 'Cumpleaños', value: (row) => formatBirthday(row.birthDay, row.birthMonth, row.birthYear) },
  { header: 'Sellos vigentes', value: (row) => (row.stampsEnabled === false ? '' : row.activeStamps) },
  { header: 'Puntos vigentes', value: (row) => (row.pointsEnabled ? (row.activePoints ?? 0) : '') },
  { header: 'Total compras ($)', value: (row) => (row.totalPurchases !== undefined ? row.totalPurchases : '') },
  { header: 'N° compras', value: (row) => (row.purchasesCount !== undefined ? row.purchasesCount : '') },
  { header: 'Próximo vencimiento', value: (row) => (row.nextExpiryAt ? new Date(row.nextExpiryAt).toISOString() : null) },
  { header: 'Cliente desde', value: (row) => new Date(row.joinedAt).toISOString() },
  { header: 'Última actividad', value: (row) => new Date(row.lastActivityAt).toISOString() },
];

export type CustomerFilter = 'all' | 'frequent' | 'new' | 'inactive';

export function getCustomerStatus(row: CustomerRow, now: Date): {
  key: 'new' | 'frequent' | 'inactive' | 'regular';
  label: string;
  tone: BadgeTone;
} {
  const joinedDays = (now.getTime() - new Date(row.joinedAt).getTime()) / 86400000;
  if (joinedDays <= 7) {
    return {
      key: 'new',
      label: 'Nuevo',
      tone: 'success',
    };
  }

  const inactiveDays = (now.getTime() - new Date(row.lastActivityAt).getTime()) / 86400000;
  if (inactiveDays >= 30) {
    return {
      key: 'inactive',
      label: 'Inactivo',
      tone: 'warning',
    };
  }

  const isFrequent = row.activeStamps >= 5 || (row.activePoints ?? 0) >= 50;
  if (isFrequent) {
    return {
      key: 'frequent',
      label: 'Frecuente',
      tone: 'info',
    };
  }

  return {
    key: 'regular',
    label: 'Al día',
    tone: 'neutral',
  };
}

export function Customers({ brandId, merchantId }: { brandId: string | null; merchantId: string | null }) {
  const { notifySuccess, notifyError } = useToast();

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerFilter>('all');
  const [page, setPage] = useState(1);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomers = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      setCustomers(await listCustomers(id));
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('No pudimos cargar tus clientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLocations = useCallback(async (id: string) => {
    try {
      setLocations(await listBrandLocations(id));
    } catch {
      setLocations([]);
    }
  }, []);

  const locationNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of locations) {
      map.set(loc.id, loc.name);
    }
    return map;
  }, [locations]);

  const branchFiltered = useMemo(() => {
    if (selectedLocationId === 'all') return customers;
    return customers.filter((c) => {
      if (c.merchantId === selectedLocationId) return true;
      return Boolean(c.locationIds?.includes(selectedLocationId));
    });
  }, [customers, selectedLocationId]);

  const now = useMemo(() => new Date(), []);

  const counts = useMemo(() => {
    let frequent = 0;
    let newCust = 0;
    let inactive = 0;
    for (const c of branchFiltered) {
      const st = getCustomerStatus(c, now);
      if (st.key === 'new') newCust++;
      else if (st.key === 'frequent') frequent++;
      else if (st.key === 'inactive') inactive++;
    }
    return { all: branchFiltered.length, frequent, new: newCust, inactive };
  }, [branchFiltered, now]);

  const purchaseMetrics = useMemo(() => {
    let totalPurchases = 0;
    let totalPurchasesCount = 0;
    let customersWithPurchases = 0;

    for (const c of branchFiltered) {
      const amount = c.totalPurchases ?? 0;
      const count = c.purchasesCount ?? 0;
      totalPurchases += amount;
      totalPurchasesCount += count;
      if (amount > 0) customersWithPurchases++;
    }

    const averageTicket = totalPurchasesCount > 0 ? Math.round(totalPurchases / totalPurchasesCount) : 0;
    return { totalPurchases, totalPurchasesCount, customersWithPurchases, averageTicket };
  }, [branchFiltered]);

  const term = search.trim().toLowerCase();
  const visible = useMemo(() => {
    return branchFiltered.filter((row) => {
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
  }, [branchFiltered, term, statusFilter, now]);

  const handleExport = () => {
    if (visible.length === 0) {
      notifyError('Todavía no tienes clientes para exportar.');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`clientes-${stamp}.csv`, toCsv(visible, getCsvColumns(locationNameMap)));
    notifySuccess(`Exportamos ${visible.length} cliente(s) a CSV.`);
  };

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
    if (brandId) {
      fetchCustomers(brandId);
      fetchLocations(brandId);
    }
  }, [brandId, fetchCustomers, fetchLocations]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pagedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return visible.slice(startIndex, startIndex + PAGE_SIZE);
  }, [visible, currentPage]);

  const getEmptyMessage = () => {
    if (customers.length === 0) {
      return {
        title: 'Aún no tienes clientes registrados.',
        subtitle: 'Aparecerán aquí en cuanto empiecen a guardar su tarjeta.',
      };
    }
    if (selectedLocationId !== 'all' && branchFiltered.length === 0) {
      const locName = locationNameMap.get(selectedLocationId) ?? 'esta sucursal';
      return {
        title: `No hay clientes registrados o con compras en ${locName}.`,
        subtitle: 'Prueba seleccionando "Todas las sucursales" o cambiando los filtros.',
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
          <td colSpan={6} className="p-8 sm:p-12 text-center">
            <EmptyState
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              title={empty.title}
              subtitle={empty.subtitle}
              titleClassName="text-lg font-bold text-panel-muted"
            />
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
          <td className="p-4 sm:p-5 align-middle">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={customerDetailPath(row.customerId)}
                className="font-bold text-panel-text hover:text-panel-accent hover:underline"
              >
                {displayName}
              </Link>
              {status.key !== 'regular' && (
                <StatusBadge tone={status.tone} size="sm">
                  {status.label}
                </StatusBadge>
              )}
            </div>
            {secondaryIdentifier && (
              <span className="block text-sm text-panel-muted font-medium mt-0.5">
                {secondaryIdentifier}
              </span>
            )}
            {locations.length > 1 && row.merchantId && locationNameMap.get(row.merchantId) && (
              <span className="inline-flex items-center gap-1 text-xs text-panel-muted font-medium mt-0.5">
                <svg className="w-3 h-3 text-panel-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{locationNameMap.get(row.merchantId)}</span>
              </span>
            )}
          </td>
          <td className="p-4 sm:p-5 whitespace-nowrap align-middle">
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
          <td className="p-4 sm:p-5 whitespace-nowrap align-middle">
            <div className="font-extrabold text-panel-text tabular-nums text-xs sm:text-sm">
              {(row.totalPurchases ?? 0) > 0 ? clp.format(row.totalPurchases!) : '—'}
            </div>
            {(row.purchasesCount ?? 0) > 0 && (
              <span className="block text-[11px] text-panel-muted font-medium mt-0.5">
                {row.purchasesCount} {row.purchasesCount === 1 ? 'compra' : 'compras'}
              </span>
            )}
          </td>
          <td className="p-4 sm:p-5 text-panel-muted font-medium text-xs sm:text-sm whitespace-nowrap align-middle">
            {new Date(row.joinedAt).toLocaleDateString([], DATE_FORMAT)}
          </td>
          <td className="p-4 sm:p-5 text-panel-muted font-medium text-xs sm:text-sm whitespace-nowrap align-middle">
            {new Date(row.lastActivityAt).toLocaleDateString([], DATE_FORMAT)}
          </td>
          <td className="p-4 sm:p-5 text-right whitespace-nowrap align-middle">
            <div className="inline-flex items-center justify-end gap-2">
              <Link
                to={customerDetailPath(row.customerId)}
                className="h-8 px-3 text-panel-accent bg-panel-accent/10 hover:bg-panel-accent/20 border border-transparent rounded-xl transition-all inline-flex items-center justify-center gap-1.5 text-xs font-semibold"
              >
                <span>Historial</span>
                <ArrowIcon className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setCustomerToDelete(row)}
                title="Eliminar datos personales (Ley 19.628)"
                className="h-8 px-3 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100/80 dark:bg-red-950/40 dark:hover:bg-red-900/40 border border-red-200/60 dark:border-red-900/60 rounded-xl transition-all inline-flex items-center justify-center gap-1.5 text-xs font-semibold shadow-2xs cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Eliminar</span>
              </button>
            </div>
          </td>
        </tr>
      );
    });
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Tu base de datos: quién vuelve y cuántos sellos lleva."
        actions={
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2.5 bg-panel-primary hover:bg-panel-primary/90 text-white shadow-md shadow-brand-blue/20 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shrink-0 self-start sm:self-auto cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Exportar CSV</span>
          </button>
        }
      />

      {error && <ErrorAlert message={error} onRetry={brandId ? () => fetchCustomers(brandId) : undefined} />}

      {!loading && customers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" aria-label="Resumen de clientes y compras">
          <StatCard
            title="Total Clientes"
            value={counts.all}
            footnote={`${counts.frequent} frecuentes · ${counts.new} nuevos`}
            footnoteTone="subtle"
            valueClassName="text-2xl font-extrabold text-panel-text tabular-nums"
          />
          <StatCard
            title="Compras Registradas"
            value={clp.format(purchaseMetrics.totalPurchases)}
            footnote={`${purchaseMetrics.customersWithPurchases} ${purchaseMetrics.customersWithPurchases === 1 ? 'cliente con compras' : 'clientes con compras'}`}
            footnoteTone="subtle"
            valueClassName="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums"
          />
          <StatCard
            title="Ticket Promedio"
            value={purchaseMetrics.averageTicket > 0 ? clp.format(purchaseMetrics.averageTicket) : '—'}
            footnote="Por compra registrada en caja"
            footnoteTone="subtle"
            valueClassName="text-2xl font-extrabold text-panel-text tabular-nums"
          />
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:max-w-xl">
          <div className="flex-1 min-w-0">
            <SearchInput
              id="customer-search"
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Buscar por nombre, correo, RUT o teléfono..."
              ariaLabel="Buscar por nombre, correo, RUT o teléfono"
            />
          </div>

          {locations.length > 1 && (
            <div className="sm:w-56 shrink-0">
              <select
                id="location-filter"
                value={selectedLocationId}
                onChange={(e) => {
                  setSelectedLocationId(e.target.value);
                  setPage(1);
                }}
                aria-label="Filtrar por sucursal"
                className="w-full h-11 px-3 rounded-xl bg-panel-surface border border-panel-border text-panel-text text-xs sm:text-sm font-semibold focus:outline-hidden focus:border-panel-accent transition-colors cursor-pointer"
              >
                <option value="all">Todas las sucursales ({customers.length})</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Filtros por estado / frecuencia */}
        <SegmentedTabs<CustomerFilter>
          value={statusFilter}
          onChange={(newVal) => {
            setStatusFilter(newVal);
            setPage(1);
          }}
          className="self-start md:self-auto"
          ariaLabel="Filtro de clientes por estado"
          options={[
            { value: 'all', label: 'Todos', count: counts.all },
            { value: 'frequent', label: 'Frecuentes', count: counts.frequent },
            { value: 'new', label: 'Nuevos', count: counts.new },
            { value: 'inactive', label: 'Inactivos', count: counts.inactive },
          ]}
        />
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

        {!loading && visible.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={visible.length}
            pageSize={PAGE_SIZE}
            itemLabel="clientes"
            onPageChange={setPage}
          />
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
