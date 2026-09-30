import { useState } from 'react';
import { Ticket, TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS } from '../../../../types/support';

export function SupportHistory({
  tickets,
  loading,
}: {
  tickets: Ticket[];
  loading: boolean;
}) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  return (
    <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/20 dark:shadow-none">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Tus solicitudes recientes</h2>
      
      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-900 rounded-xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          </div>
          <p className="text-slate-500 font-medium">No tienes solicitudes de soporte previas.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                <th className="pb-4 pl-4 font-bold">ID</th>
                <th className="pb-4 font-bold">Categoría</th>
                <th className="pb-4 font-bold">Estado</th>
                <th className="pb-4 pr-4 font-bold text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {tickets.map(ticket => (
                <tr key={ticket.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-4 pl-4 rounded-l-xl font-bold text-slate-900 dark:text-white">{ticket.id}</td>
                  <td className="py-4">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{TICKET_CATEGORY_LABELS[ticket.category]}</span>
                    <p className="text-xs text-slate-500 truncate max-w-[200px] mt-0.5">{ticket.description}</p>
                  </td>
                  <td className="py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                      ticket.status === 'OPEN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                      ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                      'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                    }`}>
                      {TICKET_STATUS_LABELS[ticket.status]}
                    </span>
                  </td>
                  <td className="py-4 pr-4 rounded-r-xl text-right">
                    <button 
                      onClick={() => setSelectedTicket(ticket)}
                      className="p-2 text-slate-500 hover:text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors"
                      title="Ver detalle"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedTicket(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Detalle del Ticket</h2>
            <p className="text-sm text-slate-500 mb-6">ID: {selectedTicket.id}</p>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Categoría</h3>
                <p className="text-slate-900 dark:text-white mt-1">{TICKET_CATEGORY_LABELS[selectedTicket.category]}</p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Estado</h3>
                <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  selectedTicket.status === 'OPEN' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                  selectedTicket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                  'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                }`}>
                  {TICKET_STATUS_LABELS[selectedTicket.status]}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Descripción</h3>
                <p className="text-slate-900 dark:text-white mt-1 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">{selectedTicket.description}</p>
              </div>
              {selectedTicket.phone && (
                <div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Teléfono</h3>
                  <p className="text-slate-900 dark:text-white mt-1">{selectedTicket.phone}</p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Fecha de Creación</h3>
                <p className="text-slate-900 dark:text-white mt-1">{selectedTicket.createdAt.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
