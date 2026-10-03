import type { ScanMethodName } from './scan.js';
import type { Paginated } from './support.js';

export const CUSTOMER_NAME_MAX = 80;
export const CUSTOMER_EMAIL_MAX = 254;
export const BIRTH_YEAR_MIN = 1900;

export interface Birthday {
  day: number;
  month: number;
  /** Opcional: el cliente puede dar solo el día y el mes. */
  year?: number | null;
}

/** Sin año, el 29 de febrero vale: el cliente puede haber nacido en un año bisiesto. */
export function isValidBirthday({ day, month, year }: Birthday, today = new Date()): boolean {
  if (!Number.isInteger(day) || !Number.isInteger(month)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  if (year !== undefined && year !== null) {
    if (!Number.isInteger(year) || year < BIRTH_YEAR_MIN || year > today.getFullYear()) return false;
    const date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1 || date > today) return false;
    return true;
  }
  const daysInMonth = new Date(2000, month, 0).getDate();
  return day <= daysInMonth;
}

/** Lo único que ve la caja del nombre del cliente. */
export function firstName(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : null;
}

export type PurchaseHistoryEntryType = 'STAMP_ADDED' | 'REWARD_REDEEMED';

export interface PurchaseHistoryEntryDto {
  id: string;
  type: PurchaseHistoryEntryType;
  createdAt: string;
  /** PANEL: el dueño sumó sellos desde la ficha del cliente. */
  method: ScanMethodName;
  locationName: string;
  /** Correo de quien registró el movimiento; null si la cuenta ya no existe. */
  staffEmail: string | null;
  /** Sellos sumados (STAMP_ADDED) o consumidos (REWARD_REDEEMED). */
  stamps: number;
  /** Pesos chilenos. */
  purchaseAmount: number | null;
  note: string | null;
  /** Solo en canjes. */
  rewardName: string | null;
  /** URL firmada de la foto de la boleta; vence en 5 minutos. */
  receiptUrl: string | null;
}

export interface CustomerProfileDto {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  rut: string | null;
  birthDay: number | null;
  birthMonth: number | null;
  birthYear: number | null;
  joinedAt: string;
  activeStamps: number;
  /** Local donde se registró: el que se propone al sumar sellos desde el panel. */
  homeLocationId: string;
}

export interface CustomerHistoryDto {
  customer: CustomerProfileDto;
  totals: { visits: number; redemptions: number; purchaseAmount: number };
  history: Paginated<PurchaseHistoryEntryDto>;
  /** Tope de sellos por carga del dueño (OWNER_MAX_STAMPS_PER_LOAD). */
  maxStampsPerLoad: number;
}

/** Respuesta de POST /api/customers/:id/stamps. */
export interface PanelStampsResultDto {
  scanId: string;
  stampsAdded: number;
  activeStamps: number;
  rewardUnlocked: boolean;
}
