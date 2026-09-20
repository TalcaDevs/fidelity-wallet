import { supabase } from '../lib/supabase';

export interface ScanCustomer {
  rut: string | null;
  phone: string | null;
}

export interface ScanWithCustomer {
  id: string;
  type: 'STAMP_ADDED' | 'REWARD_REDEEMED' | string;
  createdAt: string;
  customer: ScanCustomer | null;
}

export interface DashboardStats {
  activePasses: number;
  stampsDelivered: number;
  rewardsRedeemed: number;
  recentScans: ScanWithCustomer[];
}

export const EMPTY_STATS: DashboardStats = {
  activePasses: 0,
  stampsDelivered: 0,
  rewardsRedeemed: 0,
  recentScans: [],
};

// PostgREST devuelve los embeds anidados como objeto o como array de un elemento
// según cómo resuelva la relación, así que normalizamos en vez de castear.
function firstOrSelf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

interface RawScanRow {
  id: string;
  type: string;
  createdAt: string;
  pass?: { customer?: ScanCustomer | ScanCustomer[] | null } | { customer?: ScanCustomer | ScanCustomer[] | null }[] | null;
}

function toScan(row: RawScanRow): ScanWithCustomer {
  const pass = firstOrSelf(row.pass);
  return {
    id: row.id,
    type: row.type,
    createdAt: row.createdAt,
    customer: firstOrSelf(pass?.customer),
  };
}

export async function fetchDashboardStats(merchantId: string): Promise<DashboardStats> {
  const [passesRes, stampsRes, rewardsRes, scansRes] = await Promise.all([
    supabase.from('Pass').select('*', { count: 'exact', head: true }).eq('merchantId', merchantId),
    supabase.from('Scan').select('*', { count: 'exact', head: true }).eq('merchantId', merchantId).eq('type', 'STAMP_ADDED'),
    supabase.from('Scan').select('*', { count: 'exact', head: true }).eq('merchantId', merchantId).eq('type', 'REWARD_REDEEMED'),
    supabase.from('Scan').select('id, type, createdAt, pass:Pass(customer:Customer(rut, phone))').eq('merchantId', merchantId).order('createdAt', { ascending: false }).limit(5),
  ]);

  // supabase-js no lanza: devuelve { data, count, error }. Sin esta comprobación
  // un fallo se convertiría en un 0 y el panel mostraría métricas falsas.
  const failed = [passesRes, stampsRes, rewardsRes, scansRes].find((res) => res.error);
  if (failed?.error) throw failed.error;

  return {
    activePasses: passesRes.count ?? 0,
    stampsDelivered: stampsRes.count ?? 0,
    rewardsRedeemed: rewardsRes.count ?? 0,
    recentScans: ((scansRes.data ?? []) as RawScanRow[]).map(toScan),
  };
}
