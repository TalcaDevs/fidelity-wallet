import { supabase } from '../lib/supabase';

export interface CustomerRow {
  passId: string;
  rut: string | null;
  phone: string | null;
  // Saldo vigente: sellos ni consumidos ni vencidos. Reemplaza al viejo
  // contador plano Pass.stampsCount, que no sabía de vencimientos.
  activeStamps: number;
  nextExpiryAt: string | null;
  joinedAt: string;
  lastActivityAt: string;
}

interface RawPassRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  customer?: { rut: string | null; phone: string | null } | { rut: string | null; phone: string | null }[] | null;
}

interface RawBalanceRow {
  passId: string;
  activeStamps: number;
  nextExpiryAt: string | null;
}

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

// Dos consultas en vez de un embed: PassStampBalance es una vista y PostgREST no
// garantiza detectarle la relación con Pass, así que cruzamos por passId acá.
export async function listCustomers(merchantId: string): Promise<CustomerRow[]> {
  const [passesRes, balancesRes] = await Promise.all([
    // Pass.updatedAt cambia con cada sello, así que sirve como última actividad
    // sin tener que traer la tabla Scan completa.
    supabase
      .from('Pass')
      .select('id, createdAt, updatedAt, customer:Customer(rut, phone)')
      .eq('merchantId', merchantId)
      .order('updatedAt', { ascending: false }),
    supabase
      .from('PassStampBalance')
      .select('passId, activeStamps, nextExpiryAt')
      .eq('merchantId', merchantId),
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
      rut: customer?.rut ?? null,
      phone: customer?.phone ?? null,
      // Un pase sin sellos vigentes puede no tener fila en la vista.
      activeStamps: balance?.activeStamps ?? 0,
      nextExpiryAt: balance?.nextExpiryAt ?? null,
      joinedAt: row.createdAt,
      lastActivityAt: row.updatedAt,
    };
  });
}
