import { supabase } from '../lib/supabase';

export interface ScanCustomer {
  rut: string | null;
  phone: string | null;
}

export interface ScanWithCustomer {
  id: string;
  type: 'STAMP_ADDED' | 'REWARD_REDEEMED' | string;
  createdAt: string;
  pass?: {
    customer?: ScanCustomer | null;
  } | null;
}

export interface DashboardStats {
  activePasses: number;
  stampsDelivered: number;
  rewardsRedeemed: number;
  recentScans: ScanWithCustomer[];
}

const EMPTY_STATS: DashboardStats = {
  activePasses: 0,
  stampsDelivered: 0,
  rewardsRedeemed: 0,
  recentScans: [],
};

export async function fetchDashboardStats(merchantId: string): Promise<DashboardStats> {
  const [passesRes, stampsRes, rewardsRes, scansRes] = await Promise.all([
    supabase.from('Pass').select('*', { count: 'exact', head: true }).eq('merchantId', merchantId),
    supabase.from('Scan').select('*', { count: 'exact', head: true }).eq('merchantId', merchantId).eq('type', 'STAMP_ADDED'),
    supabase.from('Scan').select('*', { count: 'exact', head: true }).eq('merchantId', merchantId).eq('type', 'REWARD_REDEEMED'),
    supabase.from('Scan').select('id, type, createdAt, pass:Pass(customer:Customer(rut, phone))').eq('merchantId', merchantId).order('createdAt', { ascending: false }).limit(5),
  ]);

  return {
    activePasses: passesRes.count || 0,
    stampsDelivered: stampsRes.count || 0,
    rewardsRedeemed: rewardsRes.count || 0,
    recentScans: (scansRes.data as unknown as ScanWithCustomer[]) || EMPTY_STATS.recentScans,
  };
}
