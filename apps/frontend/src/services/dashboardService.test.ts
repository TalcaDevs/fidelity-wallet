import { describe, it, expect, vi } from 'vitest';
import { toScan, fetchDashboardStats } from './dashboardService';
import { supabase } from '../lib/supabase';

describe('dashboardService', () => {
  describe('toScan', () => {
    it('maps method QR correctly from raw row', () => {
      const raw = {
        id: 'scan-1',
        type: 'STAMP_ADDED',
        createdAt: '2026-09-25T12:00:00Z',
        method: 'QR' as const,
        pass: {
          customer: { rut: '12345678-5', phone: '+56912345678' },
        },
      };

      const result = toScan(raw);
      expect(result.id).toBe('scan-1');
      expect(result.method).toBe('QR');
      expect(result.customer?.rut).toBe('12345678-5');
    });

    it('maps method MANUAL correctly from raw row', () => {
      const raw = {
        id: 'scan-2',
        type: 'STAMP_ADDED',
        createdAt: '2026-09-25T12:00:00Z',
        method: 'MANUAL' as const,
        pass: {
          customer: { rut: '12345678-5', phone: '+56912345678' },
        },
      };

      const result = toScan(raw);
      expect(result.id).toBe('scan-2');
      expect(result.method).toBe('MANUAL');
    });

    it('handles arrays in postgrest nested relations', () => {
      const raw = {
        id: 'scan-3',
        type: 'REWARD_REDEEMED',
        createdAt: '2026-09-25T12:00:00Z',
        method: 'MANUAL' as const,
        pass: [
          {
            customer: [{ rut: '98765432-1', phone: null }],
          },
        ],
      };

      const result = toScan(raw);
      expect(result.method).toBe('MANUAL');
      expect(result.customer?.rut).toBe('98765432-1');
    });
  });

  describe('fetchDashboardStats', () => {
    it('includes method in the Scan select query', async () => {
      const selectCalls: string[] = [];

      const queryBuilderMock = (tableName: string) => {
        const builder: any = {
          select: vi.fn((cols: string) => {
            if (tableName === 'Scan') {
              selectCalls.push(cols);
            }
            return builder;
          }),
          eq: vi.fn(() => builder),
          order: vi.fn(() => builder),
          limit: vi.fn(() =>
            Promise.resolve({
              data: [
                {
                  id: 'scan-1',
                  type: 'STAMP_ADDED',
                  createdAt: '2026-09-25T12:00:00Z',
                  method: 'QR',
                  pass: { customer: { rut: '12.345.678-5', phone: null } },
                },
              ],
              error: null,
            }),
          ),
        };
        // for head: true count queries
        builder.then = (resolve: any) => resolve({ count: 1, error: null });
        return builder;
      };

      vi.spyOn(supabase, 'from').mockImplementation(queryBuilderMock as any);

      const stats = await fetchDashboardStats('merchant-123');
      expect(selectCalls).toContain(
        'id, type, createdAt, method, pass:Pass(customer:Customer(rut, phone))',
      );
      expect(stats.recentScans[0].method).toBe('QR');
    });
  });
});
