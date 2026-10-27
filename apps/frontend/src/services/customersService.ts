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

export interface ListCustomersOptions {
  limit?: number;
}

// Dos consultas en vez de un embed: PassStampBalance es una vista y PostgREST no
// garantiza detectarle la relación con Pass, así que cruzamos por passId acá.
// Consultamos los saldos para los passIds efectivamente seleccionados para garantizar
// coherencia exacta entre pases y saldos sin importar orden o volumen de clientes.
export const POSTGREST_PAGE_SIZE = 1000;

export async function listCustomers(brandId: string, options?: ListCustomersOptions): Promise<CustomerRow[]> {
  const passes: RawPassRow[] = [];
  const maxLimit = typeof options?.limit === 'number' && options.limit > 0 ? options.limit : null;
  let from = 0;
  let lastPassId: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const remaining = maxLimit !== null ? maxLimit - passes.length : POSTGREST_PAGE_SIZE;
    if (remaining <= 0) break;

    const pageSize = Math.min(POSTGREST_PAGE_SIZE, remaining);
    const to = from + pageSize - 1;

    let passQuery: any = supabase
      .from('Pass')
      .select('id, customerId, createdAt, updatedAt, customer:Customer(rut, phone, name, email, birthDay, birthMonth, birthYear)')
      .eq('brandId', brandId)
      .order('id', { ascending: true });

    const hasGt = typeof passQuery?.gt === 'function';
    const hasRange = typeof passQuery?.range === 'function';

    if (lastPassId && hasGt) {
      passQuery = passQuery.gt('id', lastPassId);
      if (typeof passQuery?.limit === 'function') {
        passQuery = passQuery.limit(pageSize);
      }
    } else if (hasRange) {
      passQuery = passQuery.range(from, to);
    } else if (maxLimit !== null && typeof passQuery?.limit === 'function') {
      passQuery = passQuery.limit(maxLimit);
    }

    const passesRes = await passQuery;
    if (passesRes.error) throw passesRes.error;

    const batch = (passesRes.data ?? []) as RawPassRow[];
    passes.push(...batch);

    if (
      !hasRange ||
      batch.length < pageSize ||
      (maxLimit !== null && passes.length >= maxLimit)
    ) {
      hasMore = false;
    } else {
      lastPassId = batch[batch.length - 1]?.id ?? null;
      from += batch.length;
    }
  }

  if (passes.length === 0) {
    return [];
  }

  // Ordenar en memoria por actividad reciente (updatedAt descendente).
  // La paginación por id inmutable evita perder clientes por actividad concurrente entre páginas.
  passes.sort((a, b) => {
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return timeB - timeA;
  });

  const passIds = passes.map((p) => p.id);

  // Consultar saldos únicamente para los pases seleccionados, por lotes para evitar desbordar URLs
  const CHUNK_SIZE = 100;
  const balancePromises = [];
  for (let i = 0; i < passIds.length; i += CHUNK_SIZE) {
    const chunk = passIds.slice(i, i + CHUNK_SIZE);
    balancePromises.push(
      supabase
        .from('PassStampBalance')
        .select('passId, activeStamps, activePoints, stampsEnabled, pointsEnabled, nextExpiryAt')
        .in('passId', chunk),
    );
  }

  const balanceResults = await Promise.all(balancePromises);
  const failed = balanceResults.find((res) => res.error);
  if (failed?.error) throw failed.error;

  const balances = new Map<string, RawBalanceRow>();
  for (const res of balanceResults) {
    for (const row of ((res.data ?? []) as RawBalanceRow[])) {
      balances.set(row.passId, row);
    }
  }

  return passes.map((row) => {
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
