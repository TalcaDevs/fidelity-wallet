export type TicketCategory = 'SCANNER' | 'WALLET' | 'BILLING' | 'ACCOUNT' | 'OTHER';

export interface Ticket {
  id: string;
  category: TicketCategory;
  description: string;
  phone?: string;
  attachmentUrl?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: Date;
  updatedAt: Date;
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  SCANNER: 'Falla en escaner',
  WALLET: 'Problemas con Wallet de cliente',
  BILLING: 'Facturación / Pagos',
  ACCOUNT: 'Mi Cuenta / Acceso',
  OTHER: 'Otra consulta',
};

export const TICKET_STATUS_LABELS: Record<Ticket['status'], string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En Revisión',
  RESOLVED: 'Resuelto',
};
