import { supabase } from '../lib/supabase';

export interface CustomerRow {
  passId: string;
  rut: string | null;
  phone: string | null;
  stampsCount: number;
  joinedAt: string;
  lastActivityAt: string;
}

interface RawPassRow {
  id: string;
  stampsCount: number;
  createdAt: string;
  updatedAt: string;
  customer?: { rut: string | null; phone: string | null } | { rut: string | null; phone: string | null }[] | null;
}

function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

// Pass.updatedAt cambia con cada sello, así que sirve como última actividad sin
// tener que traer la tabla Scan completa.
export async function listCustomers(merchantId: string): Promise<CustomerRow[]> {
  const { data, error } = await supabase
    .from('Pass')
    .select('id, stampsCount, createdAt, updatedAt, customer:Customer(rut, phone)')
    .eq('merchantId', merchantId)
    .order('updatedAt', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as RawPassRow[]).map((row) => {
    const customer = firstOrSelf(row.customer);
    return {
      passId: row.id,
      rut: customer?.rut ?? null,
      phone: customer?.phone ?? null,
      stampsCount: row.stampsCount,
      joinedAt: row.createdAt,
      lastActivityAt: row.updatedAt,
    };
  });
}
