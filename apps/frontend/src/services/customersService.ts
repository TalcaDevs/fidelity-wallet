import type { CustomerHistoryDto, PanelStampsResultDto, VoidScanResultDto } from '@fidelity/shared';
import { supabase } from '../lib/supabase';
import { apiUrl } from '../lib/api';
import { extractApiError } from '../lib/apiError';
import { jsonBody, requestJson } from './httpJson';

export interface CustomerRow {
  passId: string;
  customerId: string;
  rut: string | null;
  phone: string | null;
  name?: string | null;
  email?: string | null;
  birthDay?: number | null;
  birthMonth?: number | null;
  birthYear?: number | null;
  // Saldo vigente: sellos ni consumidos ni vencidos. Reemplaza al viejo
  // contador plano Pass.stampsCount, que no sabía de vencimientos.
  activeStamps: number;
  activePoints?: number;
  stampsEnabled?: boolean;
  pointsEnabled?: boolean;
  nextExpiryAt: string | null;
  joinedAt: string;
  lastActivityAt: string;
}

interface RawCustomer {
  rut: string | null;
  phone: string | null;
  name: string | null;
  email: string | null;
  birthDay: number | null;
  birthMonth: number | null;
  birthYear: number | null;
}

interface RawPassRow {
  id: string;
  customerId: string;
  createdAt: string;
  updatedAt: string;
  customer?: RawCustomer | RawCustomer[] | null;
}

interface RawBalanceRow {
  passId: string;
  activeStamps: number;
  activePoints?: number;
  stampsEnabled?: boolean;
  pointsEnabled?: boolean;
  nextExpiryAt: string | null;
}

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

// Dos consultas en vez de un embed: PassStampBalance es una vista y PostgREST no
// garantiza detectarle la relación con Pass, así que cruzamos por passId acá.
export async function listCustomers(brandId: string): Promise<CustomerRow[]> {
  const [passesRes, balancesRes] = await Promise.all([
    // Pass.updatedAt cambia con cada sello, así que sirve como última actividad
    // sin tener que traer la tabla Scan completa.
    supabase
      .from('Pass')
      .select('id, customerId, createdAt, updatedAt, customer:Customer(rut, phone, name, email, birthDay, birthMonth, birthYear)')
      .eq('brandId', brandId)
      .order('updatedAt', { ascending: false }),
    supabase
      .from('PassStampBalance')
      .select('passId, activeStamps, activePoints, stampsEnabled, pointsEnabled, nextExpiryAt')
      .eq('brandId', brandId),
  ]);

  // supabase-js no lanza: devuelve { data, error }. Sin esto, un fallo del saldo
  // dejaría la tabla en cero y el dueño creería que sus clientes no tienen sellos.
  const failed = [passesRes, balancesRes].find((res) => res.error);
  if (failed?.error) throw failed.error;

  const balances = new Map(
    ((balancesRes.data ?? []) as RawBalanceRow[]).map((row) => [row.passId, row]),
  );

  return ((passesRes.data ?? []) as RawPassRow[]).map((row) => {
    const customer = firstOrSelf(row.customer);
    const balance = balances.get(row.id);
    return {
      passId: row.id,
      customerId: row.customerId,
      rut: customer?.rut ?? null,
      phone: customer?.phone ?? null,
      name: customer?.name ?? null,
      email: customer?.email ?? null,
      birthDay: customer?.birthDay ?? null,
      birthMonth: customer?.birthMonth ?? null,
      birthYear: customer?.birthYear ?? null,
      // Un pase sin sellos vigentes puede no tener fila en la vista.
      activeStamps: balance?.activeStamps ?? 0,
      activePoints: balance?.activePoints ?? 0,
      stampsEnabled: balance?.stampsEnabled ?? true,
      pointsEnabled: balance?.pointsEnabled ?? false,
      nextExpiryAt: balance?.nextExpiryAt ?? null,
      joinedAt: row.createdAt,
      lastActivityAt: row.updatedAt,
    };
  });
}

/**
 * Elimina los datos y pase de un cliente en cumplimiento de la Ley 19.628 (cancelación de datos).
 * Requiere que el usuario autenticado sea el dueño (OWNER) del comercio.
 */
export async function deleteCustomer(merchantId: string, customerId: string): Promise<void> {
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No hay sesión activa para realizar esta acción.');
  }

  const url = apiUrl(
    `/api/customers/${encodeURIComponent(customerId)}?merchantId=${encodeURIComponent(merchantId)}`,
  );
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => null);
    throw new Error(extractApiError(errorData) ?? 'Error al eliminar los datos del cliente.');
  }
}


export const HISTORY_PAGE_SIZE = 20;

/** Historial de compras del cliente en la marca: solo el dueño (las fotos van con URL firmada). */
export function getCustomerHistory(customerId: string, brandId: string, page = 1): Promise<CustomerHistoryDto> {
  const qs = new URLSearchParams({ brandId, page: String(page), pageSize: String(HISTORY_PAGE_SIZE) });
  return requestJson(
    `/api/customers/${encodeURIComponent(customerId)}/history?${qs.toString()}`,
    undefined,
    'No pudimos cargar el historial del cliente.',
  );
}

export interface PanelStampsInput {
  currency?: 'STAMPS' | 'POINTS';
  brandId: string;
  merchantId: string;
  stampCount: number;
  reason: string;
  purchaseAmount?: number;
  note?: string;
  receipt?: File;
}

/** El dueño suma sellos desde la ficha del cliente. Con foto va en multipart. */
export function addStampsFromPanel(customerId: string, input: PanelStampsInput): Promise<PanelStampsResultDto> {
  const { receipt, ...fields } = input;
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined && value !== '');
  let init: RequestInit;
  if (receipt) {
    const form = new FormData();
    for (const [key, value] of entries) form.append(key, String(value));
    form.append('receipt', receipt);
    init = { method: 'POST', body: form };
  } else {
    init = { method: 'POST', ...jsonBody(Object.fromEntries(entries)) };
  }
  return requestJson(
    `/api/customers/${encodeURIComponent(customerId)}/stamps`,
    init,
    'No pudimos sumar los sellos.',
  );
}

/** El dueño anula una carga de sellos o puntos mal ingresada (solo OWNER). */
export function voidCustomerScan(
  customerId: string,
  scanId: string,
  brandId: string,
  reason: string,
): Promise<VoidScanResultDto> {
  return requestJson(
    `/api/customers/${encodeURIComponent(customerId)}/scans/${encodeURIComponent(scanId)}/void`,
    {
      method: 'POST',
      ...jsonBody({ brandId, reason }),
    },
    'No pudimos anular la carga.',
  );
}
