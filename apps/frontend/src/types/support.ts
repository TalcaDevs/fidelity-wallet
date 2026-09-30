export type TicketCategory = 'CUSTOMERS' | 'PROMOTIONS' | 'TEAM' | 'LOCATIONS' | 'BILLING' | 'INTEGRATIONS' | 'ACCOUNT' | 'BUGS' | 'OTHER';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_MERCHANT' | 'RESOLVED' | 'CLOSED';
export interface Ticket {
  id: string | number;
  category: TicketCategory;
  description: string;
  phone?: string;
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
  attachmentUrl?: string;
}
export const TICKET_CATEGORY_LABELS: Record<string, string> = { CUSTOMERS: 'Clientes', PROMOTIONS: 'Promociones', TEAM: 'Equipo', LOCATIONS: 'Sucursales', BILLING: 'Facturación', INTEGRATIONS: 'Integraciones', ACCOUNT: 'Cuenta', BUGS: 'Problema Técnico', OTHER: 'Otro' };
export const TICKET_STATUS_LABELS: Record<string, string> = { OPEN: 'Abierto', IN_PROGRESS: 'En curso', WAITING_ON_MERCHANT: 'Esperando respuesta', RESOLVED: 'Resuelto', CLOSED: 'Cerrado' };
