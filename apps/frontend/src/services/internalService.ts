import type {
  AuditLogEntryDto,
  CustomerHistoryDto,
  InternalBrandDetailDto,
  InternalBrandSummaryDto,
  InternalBrandUpdateInput,
  InternalCustomerDto,
  InternalLocationPinDto,
  InternalSummaryDto,
  InternalTicketDto,
  LocationDto,
  LocationPinsBbox,
  LocationUpdateInput,
  Paginated,
  PlatformMeDto,
  PlatformRole,
  RevealedCustomerDto,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UpdateTicketInput,
} from '@fidelity/shared';
import { jsonBody, requestJson } from './httpJson';

// API del panel interno (HANDOFF §11.5). Todo pasa por /api/internal/*, nunca por supabase-js.

const query = (params: Record<string, string | number | undefined | null>) => {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
};

export const INTERNAL_PAGE_SIZE = 20;

/** Para cualquier sesión: no falla si no es del equipo interno. */
export function getMyPlatformRole(): Promise<{ platformRole: PlatformRole | null }> {
  return requestJson('/api/me/access', undefined, 'No se pudo verificar tu acceso');
}

export function getPlatformMe(): Promise<PlatformMeDto> {
  return requestJson('/api/internal/me', undefined, 'No se pudo verificar tu acceso interno');
}

export interface BrandFilters {
  q?: string;
  status?: string;
  planId?: string;
  page?: number;
}

export function listBrands(filters: BrandFilters): Promise<Paginated<InternalBrandSummaryDto>> {
  return requestJson(
    `/api/internal/brands${query({ ...filters, pageSize: INTERNAL_PAGE_SIZE })}`,
    undefined,
    'No se pudieron cargar las marcas',
  );
}

export function getBrand(brandId: string): Promise<InternalBrandDetailDto> {
  return requestJson(`/api/internal/brands/${brandId}`, undefined, 'No se pudo cargar la marca');
}

export function updateBrand(
  brandId: string,
  input: InternalBrandUpdateInput & { reason?: string },
): Promise<InternalBrandDetailDto> {
  return requestJson(`/api/internal/brands/${brandId}`, { method: 'PATCH', ...jsonBody(input) }, 'No se pudo guardar la marca');
}

export function updateLocationInternal(locationId: string, input: LocationUpdateInput): Promise<LocationDto> {
  return requestJson(`/api/internal/locations/${locationId}`, { method: 'PATCH', ...jsonBody(input) }, 'No se pudo guardar el local');
}

export function getSummary(): Promise<InternalSummaryDto> {
  return requestJson('/api/internal/summary', undefined, 'No se pudo cargar el resumen');
}

export function listLocationPins(
  filters: { brandId?: string; region?: string } & Partial<LocationPinsBbox> = {},
): Promise<InternalLocationPinDto[]> {
  return requestJson(`/api/internal/locations${query(filters)}`, undefined, 'No se pudo cargar el mapa');
}

export function searchCustomers(filters: { q?: string; brandId?: string; page?: number }): Promise<Paginated<InternalCustomerDto>> {
  return requestJson(
    `/api/internal/customers${query({ ...filters, pageSize: INTERNAL_PAGE_SIZE })}`,
    undefined,
    'No se pudo buscar el cliente',
  );
}

export function revealCustomer(customerId: string, reason: string): Promise<RevealedCustomerDto> {
  return requestJson(
    `/api/internal/customers/${customerId}/reveal`,
    { method: 'POST', ...jsonBody({ reason }) },
    'No se pudo mostrar el dato',
  );
}

/** Solo SUPERADMIN. Cada consulta queda en la auditoría. */
export function getInternalCustomerHistory(
  customerId: string,
  brandId: string,
  page = 1,
): Promise<CustomerHistoryDto> {
  return requestJson(
    `/api/internal/customers/${customerId}/history${query({ brandId, page, pageSize: INTERNAL_PAGE_SIZE })}`,
    undefined,
    'No se pudo cargar el historial del cliente',
  );
}

export function listAudit(filters: { entity?: string; entityId?: string; page?: number }): Promise<Paginated<AuditLogEntryDto>> {
  return requestJson(
    `/api/internal/audit${query({ ...filters, pageSize: INTERNAL_PAGE_SIZE })}`,
    undefined,
    'No se pudo cargar la auditoría',
  );
}

export interface TicketFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  priority?: TicketPriority;
  brandId?: string;
  assigneeId?: string;
  q?: string;
  page?: number;
}

export function listInternalTickets(filters: TicketFilters): Promise<Paginated<InternalTicketDto>> {
  return requestJson(
    `/api/internal/tickets${query({ ...filters, pageSize: INTERNAL_PAGE_SIZE })}`,
    undefined,
    'No se pudieron cargar los tickets',
  );
}

export function getInternalTicket(ticketId: string): Promise<InternalTicketDto> {
  return requestJson(`/api/internal/tickets/${ticketId}`, undefined, 'No se pudo abrir el ticket');
}

export function updateInternalTicket(ticketId: string, input: UpdateTicketInput): Promise<InternalTicketDto> {
  return requestJson(`/api/internal/tickets/${ticketId}`, { method: 'PATCH', ...jsonBody(input) }, 'No se pudo actualizar el ticket');
}

export function replyInternalTicket(
  ticketId: string,
  input: { body: string; isInternal: boolean; status?: TicketStatus },
  attachment: File | null,
): Promise<InternalTicketDto> {
  const form = new FormData();
  form.set('body', input.body);
  form.set('isInternal', String(input.isInternal));
  if (input.status) form.set('status', input.status);
  if (attachment) form.set('attachment', attachment);
  return requestJson(`/api/internal/tickets/${ticketId}/messages`, { method: 'POST', body: form }, 'No se pudo enviar la respuesta');
}
