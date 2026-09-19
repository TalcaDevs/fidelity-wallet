import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface DashboardStats {
  activePasses: number;
  stampsDelivered: number;
  rewardsRedeemed: number;
  recentScans: any[];
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    activePasses: 0,
    stampsDelivered: 0,
    rewardsRedeemed: 0,
    recentScans: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (merchantId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [passesRes, stampsRes, rewardsRes, scansRes] = await Promise.all([
        supabase.from('Pass').select('*', { count: 'exact', head: true }).eq('merchantId', merchantId),
        supabase.from('Scan').select('*', { count: 'exact', head: true }).eq('merchantId', merchantId).eq('type', 'STAMP_ADDED'),
        supabase.from('Scan').select('*', { count: 'exact', head: true }).eq('merchantId', merchantId).eq('type', 'REWARD_REDEEMED'),
        supabase.from('Scan').select('id, type, createdAt, pass:Pass(customer:Customer(rut, phone))').eq('merchantId', merchantId).order('createdAt', { ascending: false }).limit(5)
      ]);

      setStats({
        activePasses: passesRes.count || 0,
        stampsDelivered: stampsRes.count || 0,
        rewardsRedeemed: rewardsRes.count || 0,
        recentScans: scansRes.data || [],
      });
    } catch (err: any) {
      setError(err.message || 'Error fetching dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, fetchStats };
}
