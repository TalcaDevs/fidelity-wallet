import { useState } from 'react';
import { useBrandLocations } from '../../hooks/useBrandLocations';
import { useSupport } from '../../hooks/useSupport';
import { SupportContact } from './components/support/SupportContact';
import { SupportForm } from './components/support/SupportForm';
import { SupportHistory } from './components/support/SupportHistory';
import { TicketDetail } from './components/support/TicketDetail';

export function Support({ brandId }: { brandId: string | null }) {
  const support = useSupport(brandId);
  const { locations } = useBrandLocations(brandId);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  function closeDetail() {
    setOpenTicketId(null);
    // Abrir el detalle lo marca como leído: se refresca la lista para quitar el punto.
    support.reload();
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Soporte</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Cuéntanos qué necesitas y te respondemos por aquí.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SupportForm locations={locations} onSubmit={support.submitTicket} />
        </div>
        <SupportContact />
      </div>

      <SupportHistory
        tickets={support.tickets}
        loading={support.loading}
        error={support.error}
        onOpen={(ticket) => setOpenTicketId(ticket.id)}
      />

      {openTicketId && (
        <TicketDetail
          key={openTicketId}
          ticketId={openTicketId}
          onClose={closeDetail}
          onLoad={support.openTicket}
          onReply={support.reply}
        />
      )}
    </div>
  );
}
