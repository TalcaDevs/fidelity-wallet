import { PanelTitle } from '../../components/admin/PanelTitle';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCustomers, deleteCustomer, type CustomerRow } from '../../services/customersService';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { maskIdentifier } from '../../lib/maskIdentifier';
import { formatStampExpiry } from '../../lib/stampExpiry';
import { downloadCsv, toCsv, type CsvColumn } from '../../lib/csv';
import { useToast } from '../../hooks/useToast';
import { customerDetailPath } from '../../components/routing/routePaths';
import { formatBirthday } from '../../lib/formatDate';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

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
  { header: 'Cliente desde', value: (row) => new Date(row.joinedAt).toISOString() },
  { header: 'Última actividad', value: (row) => new Date(row.lastActivityAt).toISOString() },
];

export function Customers({ brandId, merchantId }: { brandId: string | null; merchantId: string | null }) {
  const { notifySuccess, notifyError } = useToast();

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
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
  const now = new Date();

  const term = search.trim().toLowerCase();
  const visible = term
    ? customers.filter((row) =>
        [row.name, row.email, row.rut, row.phone].some((value) => (value ?? '').toLowerCase().includes(term)))
    : customers;

  const handleExport = () => {
    if (customers.length === 0) {
      notifyError('Todavía no tienes clientes para exportar.');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`clientes-${stamp}.csv`, toCsv(customers, CSV_COLUMNS));
    notifySuccess(`Exportamos ${customers.length} cliente(s) a CSV.`);
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

      <div className="mb-6">
        <label htmlFor="customer-search" className="sr-only">Buscar por nombre, correo, RUT o teléfono</label>
        <input
          id="customer-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, correo, RUT o teléfono..."
          className="w-full md:max-w-sm px-5 py-3 bg-panel-surface rounded-2xl border border-panel-border focus:outline-none focus:ring-4 focus:ring-panel-accent/20 focus:border-panel-accent transition-all text-panel-text font-medium"
        />
      </div>

      <div data-panel-reveal className="bg-panel-surface rounded-2xl border border-panel-border shadow-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-panel-soft border-b border-panel-border backdrop-blur-sm">
                <th className="p-6 text-sm font-bold text-panel-muted uppercase tracking-wider">Cliente</th>
                <th className="p-6 text-sm font-bold text-panel-muted uppercase tracking-wider">Saldo vigente</th>
                <th className="p-6 text-sm font-bold text-panel-muted uppercase tracking-wider">Cliente desde</th>
                <th className="p-6 text-sm font-bold text-panel-muted uppercase tracking-wider">Última actividad</th>
                <th className="p-6 text-sm font-bold text-panel-muted uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel-border">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="p-5">
                      <div className="h-12 rounded-2xl bg-panel-soft animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-panel-soft text-panel-muted mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </div>
                    <p className="text-lg font-bold text-panel-muted">
                      {customers.length === 0 ? 'Aún no tienes clientes registrados.' : 'Ningún cliente coincide con tu búsqueda.'}
                    </p>
                    <p className="text-panel-muted mt-1">
                      {customers.length === 0
                        ? 'Aparecerán aquí en cuanto empiecen a guardar su tarjeta.'
                        : 'Prueba con otro nombre, correo, RUT o teléfono.'}
                    </p>
                  </td>
                </tr>
              ) : (
                visible.map((row) => {
                  const expiryLabel = formatStampExpiry(row.nextExpiryAt, now);
                  return (
                    <tr key={row.passId} className="hover:bg-panel-soft transition-colors">
                      <td className="p-5">
                        <Link
                          to={customerDetailPath(row.customerId)}
                          className="font-bold text-panel-text hover:text-panel-accent hover:underline"
                        >
                          {row.name ?? maskIdentifier(row.rut) ?? maskIdentifier(row.phone) ?? maskIdentifier(row.email) ?? 'Anónimo'}
                        </Link>
                        {row.name && (
                          <span className="block text-sm text-panel-muted font-medium">
                            {maskIdentifier(row.phone) ?? maskIdentifier(row.email) ?? maskIdentifier(row.rut)}
                          </span>
                        )}
                      </td>
                      <td className="p-5">
                        <span className="inline-flex items-center justify-center min-w-10 h-10 px-3 rounded-full bg-panel-accent/10 dark:bg-panel-accent/20 text-panel-accent font-bold">
                          {row.stampsEnabled !== false && <span>{row.activeStamps} sellos</span>}
                          {row.pointsEnabled && <span className="block">{row.activePoints ?? 0} puntos</span>}
                        </span>
                        {/* Si la promoción no vence, no mostramos nada: un guion o un "null" solo confunde. */}
                        {expiryLabel && (
                          <span className="block text-sm text-panel-muted font-medium mt-1">
                            {expiryLabel}
                          </span>
                        )}
                      </td>
                      <td className="p-5 text-panel-muted font-medium">
                        {new Date(row.joinedAt).toLocaleDateString([], DATE_FORMAT)}
                      </td>
                      <td className="p-5 text-panel-muted font-medium">
                        {new Date(row.lastActivityAt).toLocaleDateString([], DATE_FORMAT)}
                      </td>
                      <td className="p-5 text-right whitespace-nowrap">
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
                })
              )}
            </tbody>
          </table>
        </div>
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
