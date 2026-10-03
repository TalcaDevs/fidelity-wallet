import { TICKET_ATTACHMENT_MAX_BYTES, TICKET_ATTACHMENT_MIME_TYPES } from './support.js';

export const PURCHASE_NOTE_MAX = 280;
/** Pesos chilenos: tope de cordura contra un error de tipeo, no una regla de negocio. */
export const PURCHASE_AMOUNT_MAX = 100_000_000;

export const RECEIPT_MAX_BYTES = TICKET_ATTACHMENT_MAX_BYTES;
export const RECEIPT_MIME_TYPES = TICKET_ATTACHMENT_MIME_TYPES;

/** Tope por carga del OWNER si OWNER_MAX_STAMPS_PER_LOAD no está definida. */
export const DEFAULT_OWNER_MAX_STAMPS = 10;
export const OWNER_STAMP_REASON_MIN = 5;
export const OWNER_STAMP_REASON_MAX = 280;

/** Cómo se identificó al cliente: QR, búsqueda manual en caja, o carga del dueño desde el panel. */
export type ScanMethodName = 'QR' | 'MANUAL' | 'PANEL';
