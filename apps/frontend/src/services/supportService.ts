import type {
  CreateTicketInput,
  Paginated,
  TicketDetailDto,
  TicketSummaryDto,
} from '@fidelity/shared';
import { requestJson } from './httpJson';

// API de soporte del dueño (HANDOFF §11.4, packages/shared/src/support.ts).
const base = (brandId: string) => `/api/brands/${brandId}/support/tickets`;

export const SUPPORT_PAGE_SIZE = 20;

export function listTickets(
  brandId: string,
  page = 1,
): Promise<Paginated<TicketSummaryDto>> {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(SUPPORT_PAGE_SIZE) });
  return requestJson(`${base(brandId)}?${qs}`, undefined, 'No se pudieron cargar tus solicitudes');
}

/** Abrir el detalle lo marca como leído. */
export function getTicket(brandId: string, ticketId: string): Promise<TicketDetailDto> {
  return requestJson(`${base(brandId)}/${ticketId}`, undefined, 'No se pudo abrir la solicitud');
}

export function createTicket(
  brandId: string,
  input: CreateTicketInput,
  attachment?: File | null,
): Promise<TicketDetailDto> {
  const form = new FormData();
  form.set('category', input.category);
  form.set('description', input.description);
  if (input.locationId) form.set('locationId', input.locationId);
  if (input.contactPhone) form.set('contactPhone', input.contactPhone);
  if (attachment) form.set('attachment', attachment);
  return requestJson(base(brandId), { method: 'POST', body: form }, 'No se pudo enviar tu solicitud');
}

/** Responder un ticket RESOLVED lo reabre; uno CLOSED responde 409. */
export function replyTicket(
  brandId: string,
  ticketId: string,
  body: string,
  attachment?: File | null,
): Promise<TicketDetailDto> {
  const form = new FormData();
  form.set('body', body);
  if (attachment) form.set('attachment', attachment);
  return requestJson(
    `${base(brandId)}/${ticketId}/messages`,
    { method: 'POST', body: form },
    'No se pudo enviar tu respuesta',
  );
}
