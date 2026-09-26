import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Dashboard } from './Dashboard';
import * as useDashboardStatsModule from '../../hooks/useDashboardStats';

describe('Dashboard', () => {
  it('renders QR and Manual badges for recent activity scans', () => {
    vi.spyOn(useDashboardStatsModule, 'useDashboardStats').mockReturnValue({
      stats: {
        activePasses: 10,
        stampsDelivered: 50,
        rewardsRedeemed: 5,
        recentScans: [
          {
            id: 'scan-1',
            type: 'STAMP_ADDED',
            createdAt: '2026-09-25T12:00:00Z',
            method: 'QR',
            customer: { rut: '12345678-5', phone: null },
          },
          {
            id: 'scan-2',
            type: 'REWARD_REDEEMED',
            createdAt: '2026-09-25T12:05:00Z',
            method: 'MANUAL',
            customer: { rut: null, phone: '+56912345678' },
          },
        ],
      },
      loading: false,
      error: null,
      fetchStats: vi.fn(),
    });

    render(<Dashboard session={null} merchantId="merchant-1" />);

    expect(screen.getByText('QR')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });
});
