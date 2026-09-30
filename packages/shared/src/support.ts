// Contrato de tickets de soporte (HANDOFF §11.4). Lo implementa el backend y lo consumen el
// panel del dueño (/admin/support) y el panel interno (/internal/tickets).

export const TICKET_CATEGORIES = [
  'SCANNER',
  'WALLET',
  'CUSTOMERS',
  'PROMOTIONS',
  'TEAM',
  'LOCATIONS',
  'BILLING',
  'ACCOUNT',
  'OTHER',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  SCANNER: 'Escáner / cámara',
  WALLET: 'Tarjetas en Apple / Google Wallet',
  CUSTOMERS: 'Clientes y sellos',
  PROMOTIONS: 'Promociones y programas',
  TEAM: 'Equipo y accesos de meseros',
  LOCATIONS: 'Sucursales',
  BILLING: 'Facturación y planes',
  ACCOUNT: 'Mi cuenta / inicio de sesión',
  OTHER: 'Otro',
};

export const TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_ON_MERCHANT',
  'RESOLVED',
  'CLOSED',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En revisión',
  WAITING_ON_MERCHANT: 'Esperando tu respuesta',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};

/** Las mismas etiquetas, desde el punto de vista del equipo interno. */
export const TICKET_STATUS_LABELS_INTERNAL: Record<TicketStatus, string> = {
  ...TICKET_STATUS_LABELS,
  WAITING_ON_MERCHANT: 'Esperando al comercio',
};

/** Solo la asigna el equipo interno. */
export const TICKET_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export type TicketAuthorType = 'MERCHANT' | 'PLATFORM';

/**
 * Cambios de estado que el equipo interno puede hacer a mano. Las respuestas también mueven el
 * estado (ver backend): la del equipo pasa a WAITING_ON_MERCHANT y la del dueño a IN_PROGRESS,
 * o a OPEN si el ticket estaba RESOLVED.
 */
export const TICKET_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING_ON_MERCHANT', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['WAITING_ON_MERCHANT', 'RESOLVED'],
  WAITING_ON_MERCHANT: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['IN_PROGRESS', 'CLOSED'],
  CLOSED: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TICKET_TRANSITIONS[from].includes(to);
}

/** Un RESOLVED sin respuesta del dueño se cierra solo pasado este plazo. */
export const TICKET_AUTO_CLOSE_DAYS = 7;

export const TICKET_DESCRIPTION_MIN = 20;
export const TICKET_TEXT_MAX = 5000;
export const TICKET_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const TICKET_ATTACHMENT_MIME_TYPES = ['image/png', 'image/jpeg'] as const;
export type TicketAttachmentMimeType = (typeof TICKET_ATTACHMENT_MIME_TYPES)[number];

export interface TicketAttachmentDto {
  id: string;
  fileName: string;
  mimeType: TicketAttachmentMimeType;
  sizeBytes: number;
  /** URL firmada de Supabase Storage; vence en 5 minutos. */
  url: string;
}

export interface TicketMessageDto {
  id: string;
  authorType: TicketAuthorType;
  /** "Equipo de soporte" en las respuestas del equipo hacia el dueño. */
  authorName: string;
  body: string;
  /** Siempre false en los endpoints del dueño. */
  isInternal: boolean;
  attachments: TicketAttachmentDto[];
  createdAt: string;
}

export interface TicketSummaryDto {
  id: string;
  /** Correlativo legible (#1024). */
  number: number;
  category: TicketCategory;
  status: TicketStatus;
  /** Primeros 120 caracteres de la descripción. */
  excerpt: string;
  locationId: string | null;
  locationName: string | null;
  lastMessageAt: string;
  createdAt: string;
  unreadForMerchant: boolean;
}

export interface TicketDetailDto extends TicketSummaryDto {
  description: string;
  /** E.164. */
  contactPhone: string | null;
  attachments: TicketAttachmentDto[];
  messages: TicketMessageDto[];
}

export interface InternalTicketDto extends TicketDetailDto {
  brandId: string;
  brandName: string;
  priority: TicketPriority;
  assignee: { userId: string; name: string } | null;
  createdBy: { userId: string; email: string | null };
  resolvedAt: string | null;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Campos del formulario de alta (multipart/form-data, más `attachment` opcional). */
export interface CreateTicketInput {
  category: TicketCategory;
  description: string;
  locationId?: string;
  contactPhone?: string;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigneeId?: string | null;
}
