import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchOverviewReport,
  fetchRetentionReport,
  fetchPromotionsReport,
  fetchStaffActivityReport,
} from './reportsService';
import * as apiModule from '../lib/api';

describe('reportsService', () => {
  const merchantId = 'm-uuid-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchOverviewReport', () => {
    it('calls authenticatedFetch with correct URL and query parameters', async () => {
      const mockData = { kpis: { newCustomers: { current: 10 } } };
      vi.spyOn(apiModule, 'authenticatedFetch').mockResolvedValue(
        new Response(JSON.stringify(mockData), { status: 200 }),
      );

      const result = await fetchOverviewReport(merchantId, {
        from: '2026-09-01',
        to: '2026-09-15',
        tz: 'America/Santiago',
      });

      expect(apiModule.authenticatedFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `/api/merchants/${merchantId}/reports/overview?from=2026-09-01&to=2026-09-15&tz=America%2FSantiago`,
        ),
      );
      expect(result).toEqual(mockData);
    });

    it('throws error when response is not ok', async () => {
      vi.spyOn(apiModule, 'authenticatedFetch').mockResolvedValue(
        new Response(JSON.stringify({ message: 'Solo el dueño puede acceder' }), {
          status: 403,
        }),
      );

      await expect(fetchOverviewReport(merchantId)).rejects.toThrow(
        'Solo el dueño puede acceder',
      );
    });
  });

  describe('fetchRetentionReport', () => {
    it('calls authenticatedFetch with dormantDays and tz', async () => {
      const mockData = { dormantCustomers: { count: 5, customers: [] } };
      vi.spyOn(apiModule, 'authenticatedFetch').mockResolvedValue(
        new Response(JSON.stringify(mockData), { status: 200 }),
      );

      const result = await fetchRetentionReport(merchantId, {
        dormantDays: 45,
        tz: 'America/Santiago',
      });

      expect(apiModule.authenticatedFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `/api/merchants/${merchantId}/reports/retention?dormantDays=45&tz=America%2FSantiago`,
        ),
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('fetchPromotionsReport', () => {
    it('calls authenticatedFetch for promotions report', async () => {
      const mockData = { promotions: [] };
      vi.spyOn(apiModule, 'authenticatedFetch').mockResolvedValue(
        new Response(JSON.stringify(mockData), { status: 200 }),
      );

      const result = await fetchPromotionsReport(merchantId);

      expect(apiModule.authenticatedFetch).toHaveBeenCalledWith(
        `/api/merchants/${merchantId}/reports/promotions`,
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('fetchStaffActivityReport', () => {
    it('calls authenticatedFetch for staff activity report', async () => {
      const mockData = { staff: [] };
      vi.spyOn(apiModule, 'authenticatedFetch').mockResolvedValue(
        new Response(JSON.stringify(mockData), { status: 200 }),
      );

      const result = await fetchStaffActivityReport(merchantId);

      expect(apiModule.authenticatedFetch).toHaveBeenCalledWith(
        `/api/merchants/${merchantId}/reports/staff`,
      );
      expect(result).toEqual(mockData);
    });
  });
});
