import { useCallback, useEffect, useState } from 'react';
import { listCustomers, deleteCustomer, type CustomerRow } from '../../services/customersService';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { maskIdentifier } from '../../lib/maskIdentifier';
import { formatStampExpiry } from '../../lib/stampExpiry';
import { downloadCsv, toCsv, type CsvColumn } from '../../lib/csv';
import { useToast } from '../../hooks/useToast';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

// La exportación lleva el dato completo: es la base de datos del comercio y el
// dueño la está pidiendo explícitamente. En pantalla se muestra enmascarado.
const CSV_COLUMNS: CsvColumn<CustomerRow>[] = [
  { header: 'RUT', value: (row) => row.rut },
  { header: 'Teléfono', value: (row) => row.phone },
  { header: 'Sellos vigentes', value: (row) => row.activeStamps },
  { header: 'Próximo vencimiento', value: (row) => (row.nextExpiryAt ? new Date(row.nextExpiryAt).toISOString() : null) },
  { header: 'Cliente desde', value: (row) => new Date(row.joinedAt).toISOString() },
  { header: 'Última actividad', value: (row) => new Date(row.lastActivityAt).toISOString() },
];

export function Customers({ merchantId }: { merchantId: string | null }) {
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
    if (!merchantId || !customerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(merchantId, customerToDelete.customerId);
      notifySuccess('Datos del cliente eliminados exitosamente (Ley 19.628).');
      setCustomerToDelete(null);
      fetchCustomers(merchantId);
    } catch (err: unknown) {
      console.error('Error al eliminar cliente:', err);
      notifyError(err instanceof Error ? err.message : 'No se pudo eliminar al cliente.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (merchantId) fetchCustomers(merchantId);
  }, [merchantId, fetchCustomers]);

  // Un único "ahora" para todo el render: si cada fila creara el suyo, dos filas
  // con la misma fecha podrían quedar con textos distintos al cruzar la medianoche.
  const now = new Date();

  const term = search.trim().toLowerCase();
  const visible = term
    ? customers.filter((row) =>
        (row.rut ?? '').toLowerCase().includes(term) || (row.phone ?? '').toLowerCase().includes(term))
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
      <header className="mb-12 flex flex-col md:flex-row md:justify-between md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Clientes</h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">Tu base de datos: quién vuelve y cuántos sellos lleva.</p>
        </div>
        <button
          onClick={handleExport}
          className="px-6 py-3 bg-brand-blue hover:bg-blue-600 text-white shadow-lg shadow-brand-blue/20 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          Exportar CSV
        </button>
      </header>

      {error && <ErrorAlert message={error} />}

      <div className="mb-6">
        <label htmlFor="customer-search" className="sr-only">Buscar por RUT o teléfono</label>
        <input
          id="customer-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por RUT o teléfono..."
          className="w-full md:max-w-sm px-5 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-blue/20 focus:border-brand-blue transition-all text-slate-800 dark:text-slate-100 font-medium"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm">
                <th className="p-6 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente</th>
                <th className="p-6 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sellos vigentes</th>
                <th className="p-6 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente desde</th>
                <th className="p-6 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Última actividad</th>
                <th className="p-6 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="p-5">
                      <div className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </div>
                    <p className="text-lg font-bold text-slate-600 dark:text-slate-300">
                      {customers.length === 0 ? 'Aún no tienes clientes registrados.' : 'Ningún cliente coincide con tu búsqueda.'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      {customers.length === 0
                        ? 'Aparecerán aquí en cuanto empiecen a guardar su tarjeta.'
                        : 'Prueba con otro RUT o teléfono.'}
                    </p>
                  </td>
                </tr>
              ) : (
                visible.map((row) => {
                  const expiryLabel = formatStampExpiry(row.nextExpiryAt, now);
                  return (
                    <tr key={row.passId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-5 font-bold text-slate-900 dark:text-slate-100">
                        {maskIdentifier(row.rut) ?? maskIdentifier(row.phone) ?? 'Anónimo'}
                      </td>
                      <td className="p-5">
                        <span className="inline-flex items-center justify-center min-w-10 h-10 px-3 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue font-bold">
                          {row.activeStamps}
                        </span>
                        {/* Si la promoción no vence, no mostramos nada: un guion o un "null" solo confunde. */}
                        {expiryLabel && (
                          <span className="block text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                            {expiryLabel}
                          </span>
                        )}
                      </td>
                      <td className="p-5 text-slate-600 dark:text-slate-300 font-medium">
                        {new Date(row.joinedAt).toLocaleDateString([], DATE_FORMAT)}
                      </td>
                      <td className="p-5 text-slate-600 dark:text-slate-300 font-medium">
                        {new Date(row.lastActivityAt).toLocaleDateString([], DATE_FORMAT)}
                      </td>
                      <td className="p-5 text-right">
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
        <ConfirmDialog
          title="¿Eliminar datos de este cliente?"
          message={`¿Estás seguro de que deseas eliminar permanentemente a este cliente (${
            maskIdentifier(customerToDelete.rut) ?? maskIdentifier(customerToDelete.phone) ?? 'Anónimo'
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
