import { useCallback } from 'react';
import type { CreateTicketInput, TicketDetailDto } from '@fidelity/shared';
import * as supportService from '../services/supportService';
import { useAsyncData, errorMessage } from './useAsyncData';
import { useToast } from './useToast';

export function useSupport(brandId: string | null) {
  const { notifySuccess, notifyError } = useToast();
  const fetcher = useCallback(() => supportService.listTickets(brandId!), [brandId]);
  const { data, loading, error, reload } = useAsyncData(brandId ? fetcher : null);

  const submitTicket = useCallback(
    async (input: CreateTicketInput, attachment: File | null): Promise<boolean> => {
      if (!brandId) return false;
      try {
        const ticket = await supportService.createTicket(brandId, input, attachment);
        notifySuccess(`Recibimos tu solicitud #${ticket.number}. Te responderemos por aquí.`);
        reload();
        return true;
      } catch (err) {
        notifyError(errorMessage(err));
        return false;
      }
    },
    [brandId, notifySuccess, notifyError, reload],
  );

  const openTicket = useCallback(
    (ticketId: string) => supportService.getTicket(brandId!, ticketId),
    [brandId],
  );

  const reply = useCallback(
    async (ticketId: string, body: string, attachment: File | null): Promise<TicketDetailDto | null> => {
      if (!brandId) return null;
      try {
        const ticket = await supportService.replyTicket(brandId, ticketId, body, attachment);
        notifySuccess('Respuesta enviada');
        reload();
        return ticket;
      } catch (err) {
        notifyError(errorMessage(err));
        return null;
      }
    },
    [brandId, notifySuccess, notifyError, reload],
  );

  return {
    tickets: data?.items ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    reload,
    submitTicket,
    openTicket,
    reply,
  };
}
