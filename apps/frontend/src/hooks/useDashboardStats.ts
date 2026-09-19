import { useState, useCallback } from 'react';
import { fetchDashboardStats, type DashboardStats } from '../services/dashboardService';

export type { DashboardStats };

const EMPTY_STATS: DashboardStats = {
  activePasses: 0,
  stampsDelivered: 0,
  rewardsRedeemed: 0,
  recentScans: [],
};

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (merchantId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardStats(merchantId);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching dashboard data');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, fetchStats };
}
