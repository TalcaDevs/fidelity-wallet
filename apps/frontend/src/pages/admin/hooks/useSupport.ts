import { useState, useCallback, useEffect } from 'react';
import { fetchTickets, createTicket } from '../../../services/supportService';
import type { Ticket, TicketCategory } from '../../../types/support';
import { useToast } from '../../../hooks/useToast';

export function useSupport() {
  const { notifySuccess, notifyError } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTickets();
      setTickets(data);
    } catch (err: any) {
      notifyError(err.message || 'Error cargando tickets');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const submitTicket = useCallback(async (
    category: TicketCategory, 
    description: string, 
    phone?: string, 
    file?: File | null
  ) => {
    try {
      await createTicket(category, description, phone, file || undefined);
      notifySuccess('Tu solicitud ha sido enviada con éxito. Te contactaremos pronto.');
      await loadTickets();
      return true;
    } catch (err: any) {
      notifyError(err.message || 'Error enviando solicitud');
      return false;
    }
  }, [loadTickets, notifySuccess, notifyError]);

  return { tickets, loading, loadTickets, submitTicket };
}
