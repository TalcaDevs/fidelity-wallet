import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteCustomer, listCustomers } from './customersService';
import { supabase } from '../lib/supabase';

describe('customersService - balances', () => {
  it('keeps independent point and stamp balances and modality flags from the balance view', async () => {
    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 'p-1', customerId: 'c-1', createdAt: '2026-10-01', updatedAt: '2026-10-06', customer: { name: 'María' } }], error: null }),
    };
    const balances = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [{ passId: 'p-1', activeStamps: 0, activePoints: 42, stampsEnabled: false, pointsEnabled: true, nextExpiryAt: null }], error: null }),
    };
    const from = vi.spyOn(supabase, 'from')
      .mockReturnValueOnce(passes as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(balances as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any);
    try {
      expect(await listCustomers('b-1')).toEqual([expect.objectContaining({ activeStamps: 0, activePoints: 42, stampsEnabled: false, pointsEnabled: true })]);
      expect(balances.select).toHaveBeenCalledWith('passId, activeStamps, activePoints, stampsEnabled, pointsEnabled, nextExpiryAt');
    } finally {
      from.mockRestore();
    }
  });

  it('correctly maps balances even with 201 passes returned in reverse order', async () => {
    const mockPasses = Array.from({ length: 201 }, (_, i) => ({
      id: `p-${i}`,
      customerId: `c-${i}`,
      createdAt: '2026-10-01',
      updatedAt: '2026-10-06',
      customer: { name: `Cliente ${i}` },
    }));

    // Balances in reverse order: p-200 down to p-0
    const mockBalances = Array.from({ length: 201 }, (_, idx) => {
      const i = 200 - idx;
      return {
        passId: `p-${i}`,
        activeStamps: i === 0 ? 8 : 1,
        activePoints: i === 0 ? 40 : 10,
        stampsEnabled: true,
        pointsEnabled: true,
        nextExpiryAt: null,
      };
    });

    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockPasses, error: null }),
    };

    // The implementation chunks in batches of 100, so 201 passes will do 3 in() queries
    const balanceSelect = vi.fn().mockReturnThis();
    const balanceIn = vi.fn().mockImplementation((_col: string, ids: string[]) => {
      const matching = mockBalances.filter((b) => ids.includes(b.passId));
      return Promise.resolve({ data: matching, error: null });
    });

    const balances = {
      select: balanceSelect,
      in: balanceIn,
    };

    const from = vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'Pass') return passes as any;
      if (table === 'PassStampBalance') return balances as any;
      return {} as any;
    }) as any);

    try {
      const result = await listCustomers('b-1');
      expect(result).toHaveLength(201);

      // Verify p-0 is not zeroed out or default
      const p0 = result.find((r) => r.passId === 'p-0');
      expect(p0).toBeDefined();
      expect(p0?.activeStamps).toBe(8);
      expect(p0?.activePoints).toBe(40);
      expect(p0?.pointsEnabled).toBe(true);

      // Verify p-200
      const p200 = result.find((r) => r.passId === 'p-200');
      expect(p200).toBeDefined();
      expect(p200?.activeStamps).toBe(1);
      expect(p200?.activePoints).toBe(10);
    } finally {
      from.mockRestore();
    }
  });

  it('does not truncate dataset when no limit option is provided, returning all passes for complete export and search', async () => {
    const mockPasses = Array.from({ length: 205 }, (_, i) => ({
      id: `p-${i}`,
      customerId: `c-${i}`,
      createdAt: '2026-10-01',
      updatedAt: '2026-10-06',
      customer: { name: `Cliente ${i}` },
    }));

    const limitMock = vi.fn();
    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue({
        then: (resolve: any) => resolve({ data: mockPasses, error: null }),
        limit: limitMock,
      }),
    };

    const balances = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const from = vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'Pass') return passes as any;
      if (table === 'PassStampBalance') return balances as any;
      return {} as any;
    }) as any);

    try {
      const result = await listCustomers('b-1');
      expect(result).toHaveLength(205);
      expect(limitMock).not.toHaveBeenCalled();
    } finally {
      from.mockRestore();
    }
  });

  it('applies limit when explicit limit option is passed', async () => {
    const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue({
        limit: limitMock,
      }),
    };

    const from = vi.spyOn(supabase, 'from')
      .mockReturnValueOnce(passes as unknown as ReturnType<typeof supabase.from>);

    try {
      await listCustomers('b-1', { limit: 50 });
      expect(limitMock).toHaveBeenCalledWith(50);
    } finally {
      from.mockRestore();
    }
  });

  it('retrieves full dataset across multiple pages when total passes exceed PostgREST 1000 max_rows server limit', async () => {
    // 1005 passes in total (exceeds PostgREST max_rows = 1000)
    const mockPasses = Array.from({ length: 1005 }, (_, i) => ({
      id: `p-${i}`,
      customerId: `c-${i}`,
      createdAt: '2026-10-01',
      updatedAt: '2026-10-06',
      customer: { name: `Cliente ${i}` },
    }));

    const rangeMock = vi.fn().mockImplementation((from: number, to: number) => {
      // Simulate PostgREST max_rows = 1000: returns at most 1000 rows per request
      const requested = mockPasses.slice(from, to + 1);
      const capped = requested.slice(0, 1000);
      return Promise.resolve({ data: capped, error: null });
    });

    const orderMock = vi.fn().mockReturnValue({
      range: rangeMock,
    });

    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: orderMock,
    };

    const balances = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const from = vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'Pass') return passes as any;
      if (table === 'PassStampBalance') return balances as any;
      return {} as any;
    }) as any);

    try {
      const result = await listCustomers('b-1');

      // Verifies all 1005 passes are returned without truncation
      expect(result).toHaveLength(1005);
      expect(result[0].passId).toBe('p-0');
      expect(result[1004].passId).toBe('p-1004');

      // Verifies range was called twice: 0-999 (returned 1000) and 1000-1999 (returned 5)
      expect(rangeMock).toHaveBeenCalledTimes(2);
      expect(rangeMock).toHaveBeenNthCalledWith(1, 0, 999);
      expect(rangeMock).toHaveBeenNthCalledWith(2, 1000, 1999);

      // Verifies stable immutable ordering by id to prevent pagination shift
      expect(orderMock).toHaveBeenCalledWith('id', { ascending: true });
    } finally {
      from.mockRestore();
    }
  });

  it('preserves all 1001 customers without duplicates or omissions even if activity changes between pages', async () => {
    // 1001 passes with immutable IDs p-0000 to p-1000
    const mockPasses = Array.from({ length: 1001 }, (_, i) => ({
      id: `p-${String(i).padStart(4, '0')}`,
      customerId: `c-${i}`,
      createdAt: '2026-10-01',
      updatedAt: '2026-10-06T10:00:00Z',
      customer: { name: `Cliente ${i}` },
    }));

    let callCount = 0;
    const rangeMock = vi.fn().mockImplementation((_from: number, _to: number) => {
      callCount++;
      if (callCount === 1) {
        // First page returned 0..999
        return Promise.resolve({ data: mockPasses.slice(0, 1000), error: null });
      }
      // Between page 1 and page 2, customer p-1000 receives a stamp (activity updated to NOW)
      mockPasses[1000].updatedAt = '2026-10-27T20:00:00Z';
      return Promise.resolve({ data: mockPasses.slice(1000, 1001), error: null });
    });

    const orderMock = vi.fn().mockReturnValue({
      range: rangeMock,
    });

    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: orderMock,
    };

    const balances = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const from = vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'Pass') return passes as any;
      if (table === 'PassStampBalance') return balances as any;
      return {} as any;
    }) as any);

    try {
      const result = await listCustomers('b-1');
      // Verifies all 1001 unique passes are retrieved without omission or duplicate
      expect(result).toHaveLength(1001);
      const uniqueIds = new Set(result.map((r) => r.passId));
      expect(uniqueIds.size).toBe(1001);
      // Because p-1000 was updated with newest activity, it should be sorted to the very top in memory
      expect(result[0].passId).toBe('p-1000');
    } finally {
      from.mockRestore();
    }
  });

  it('applies range limit for partial page when explicit limit is smaller than 1000', async () => {
    const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const orderMock = vi.fn().mockReturnValue({
      range: rangeMock,
    });
    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: orderMock,
    };
    const from = vi.spyOn(supabase, 'from').mockReturnValueOnce(passes as unknown as ReturnType<typeof supabase.from>);
    try {
      await listCustomers('b-1', { limit: 50 });
      expect(rangeMock).toHaveBeenCalledWith(0, 49);
    } finally {
      from.mockRestore();
    }
  });

  it('returns empty array directly without querying balance view if brand has no passes', async () => {
    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const from = vi.spyOn(supabase, 'from')
      .mockReturnValueOnce(passes as unknown as ReturnType<typeof supabase.from>);

    try {
      const result = await listCustomers('b-empty');
      expect(result).toEqual([]);
      // Only 1 call to supabase.from ('Pass'), none for 'PassStampBalance'
      expect(from).toHaveBeenCalledTimes(1);
    } finally {
      from.mockRestore();
    }
  });

  it('aggregates total purchases and purchase counts per customer from non-voided scans', async () => {
    const mockPasses = [
      { id: 'p-1', customerId: 'c-1', createdAt: '2026-10-01', updatedAt: '2026-10-06', customer: { name: 'Cliente Con Compras' } },
      { id: 'p-2', customerId: 'c-2', createdAt: '2026-10-01', updatedAt: '2026-10-06', customer: { name: 'Cliente Sin Compras' } },
    ];

    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockPasses, error: null }),
    };

    const balances = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { passId: 'p-1', activeStamps: 3, activePoints: 0, stampsEnabled: true, pointsEnabled: false, nextExpiryAt: null },
          { passId: 'p-2', activeStamps: 1, activePoints: 0, stampsEnabled: true, pointsEnabled: false, nextExpiryAt: null },
        ],
        error: null,
      }),
    };

    const mockScans = [
      { passId: 'p-1', purchaseAmount: 15000 },
      { passId: 'p-1', purchaseAmount: 25000 },
    ];

    const scans = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({ data: mockScans, error: null }),
    };

    const from = vi.spyOn(supabase, 'from')
      .mockReturnValueOnce(passes as any)
      .mockReturnValueOnce(balances as any)
      .mockReturnValue(scans as any);

    try {
      const result = await listCustomers('b-1');
      expect(result).toHaveLength(2);

      const c1 = result.find((r) => r.passId === 'p-1');
      expect(c1).toBeDefined();
      expect(c1?.totalPurchases).toBe(40000);
      expect(c1?.purchasesCount).toBe(2);

      const c2 = result.find((r) => r.passId === 'p-2');
      expect(c2).toBeDefined();
      expect(c2?.totalPurchases).toBe(0);
      expect(c2?.purchasesCount).toBe(0);
    } finally {
      from.mockRestore();
    }
  });

  it('retrieves and aggregates all scans across multiple pages when total scans exceed PostgREST 1000 max_rows server limit (P1)', async () => {
    // 1001 compras de $1.000 para el cliente p-1 (supera PostgREST max_rows=1000)
    const mockPasses = [
      { id: 'p-1', customerId: 'c-1', createdAt: '2026-10-01', updatedAt: '2026-10-06', customer: { name: 'Cliente Frecuente' } },
    ];

    const mockScans = Array.from({ length: 1001 }, (_, i) => ({
      id: `scan-${i}`,
      passId: 'p-1',
      purchaseAmount: 1000,
      createdAt: '2026-10-05T12:00:00Z',
    }));

    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockPasses, error: null }),
      }),
    };

    const balances = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const scanRangeMock = vi.fn().mockImplementation((from: number, to: number) => {
      // Simula PostgREST max_rows = 1000
      const requested = mockScans.slice(from, to + 1);
      const capped = requested.slice(0, 1000);
      return Promise.resolve({ data: capped, error: null });
    });

    const scanOrderMock = vi.fn().mockReturnValue({
      range: scanRangeMock,
    });

    const scans = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: scanOrderMock,
    };

    const from = vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'Pass') return passes as any;
      if (table === 'PassStampBalance') return balances as any;
      if (table === 'Scan') return scans as any;
      return {} as any;
    }) as any);

    try {
      const result = await listCustomers('b-1');
      expect(result).toHaveLength(1);

      // Verifies all 1001 purchases of $1000 are summed ($1.001.000 y 1001 compras)
      expect(result[0].totalPurchases).toBe(1001000);
      expect(result[0].purchasesCount).toBe(1001);

      // Verifies range was called twice: 0-999 (returned 1000) and 1000-1999 (returned 1)
      expect(scanRangeMock).toHaveBeenCalledTimes(2);
      expect(scanRangeMock).toHaveBeenNthCalledWith(1, 0, 999);
      expect(scanRangeMock).toHaveBeenNthCalledWith(2, 1000, 1999);

      // Verifies immutable ordering by id to prevent pagination shift
      expect(scanOrderMock).toHaveBeenCalledWith('id', { ascending: true });
    } finally {
      from.mockRestore();
    }
  });

  it('does not duplicate purchases if new activity is inserted between scan pages', async () => {
    const mockPasses = [
      { id: 'p-1', customerId: 'c-1', createdAt: '2026-10-01', updatedAt: '2026-10-06', customer: { name: 'Cliente Frecuente' } },
    ];

    const mockScans = Array.from({ length: 1001 }, (_, i) => ({
      id: `scan-${String(i).padStart(4, '0')}`,
      passId: 'p-1',
      purchaseAmount: 1000,
      createdAt: '2026-10-05T12:00:00Z',
    }));

    let pageCount = 0;
    const scanRangeMock = vi.fn().mockImplementation((_from: number, _to: number) => {
      pageCount++;
      if (pageCount === 1) {
        return Promise.resolve({ data: mockScans.slice(0, 1000), error: null });
      }
      // Simulate concurrent scan insertion after page 1
      mockScans.push({
        id: 'scan-concurrent',
        passId: 'p-1',
        purchaseAmount: 99999,
        createdAt: new Date().toISOString(),
      });
      return Promise.resolve({ data: mockScans.slice(1000, 1001), error: null });
    });

    const scanOrderMock = vi.fn().mockReturnValue({
      range: scanRangeMock,
    });

    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockPasses, error: null }),
    };

    const balances = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const scans = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: scanOrderMock,
    };

    const from = vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'Pass') return passes as any;
      if (table === 'PassStampBalance') return balances as any;
      if (table === 'Scan') return scans as any;
      return {} as any;
    }) as any);

    try {
      const result = await listCustomers('b-1');
      expect(result).toHaveLength(1);
      // Ensures purchases count and total are strictly 1001 and not inflated by duplicates
      expect(result[0].purchasesCount).toBe(1001);
      expect(result[0].totalPurchases).toBe(1001000);
    } finally {
      from.mockRestore();
    }
  });

  it('propagates database error when querying scans instead of masking it with 0 purchases (P2)', async () => {
    const mockPasses = [
      { id: 'p-1', customerId: 'c-1', createdAt: '2026-10-01', updatedAt: '2026-10-06', customer: { name: 'Cliente Frecuente' } },
    ];

    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockPasses, error: null }),
      }),
    };

    const balances = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const scans = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: null, error: { message: 'database unavailable' } }),
      }),
    };

    const from = vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'Pass') return passes as any;
      if (table === 'PassStampBalance') return balances as any;
      if (table === 'Scan') return scans as any;
      return {} as any;
    }) as any);

    try {
      await expect(listCustomers('b-1')).rejects.toEqual(
        expect.objectContaining({ message: 'database unavailable' }),
      );
    } finally {
      from.mockRestore();
    }
  });

  it('retrieves full dataset across multiple pages when total passes exceed PostgREST 1000 max_rows server limit', async () => {
    // 1005 passes in total (exceeds PostgREST max_rows = 1000)
    const mockPasses = Array.from({ length: 1005 }, (_, i) => ({
      id: `p-${i}`,
      customerId: `c-${i}`,
      createdAt: '2026-10-01',
      updatedAt: '2026-10-06',
      customer: { name: `Cliente ${i}` },
    }));

    const rangeMock = vi.fn().mockImplementation((from: number, to: number) => {
      // Simulate PostgREST max_rows = 1000: returns at most 1000 rows per request
      const requested = mockPasses.slice(from, to + 1);
      const capped = requested.slice(0, 1000);
      return Promise.resolve({ data: capped, error: null });
    });

    const orderMock = vi.fn().mockReturnValue({
      range: rangeMock,
    });

    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: orderMock,
    };

    const balances = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const scans = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };

    const from = vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'Pass') return passes as any;
      if (table === 'PassStampBalance') return balances as any;
      if (table === 'Scan') return scans as any;
      return {} as any;
    }) as any);

    try {
      const result = await listCustomers('b-1');

      // Verifies all 1005 passes are returned without truncation
      expect(result).toHaveLength(1005);
      expect(result[0].passId).toBe('p-0');
      expect(result[1004].passId).toBe('p-1004');

      // Verifies range was called twice: 0-999 (returned 1000) and 1000-1999 (returned 5)
      expect(rangeMock).toHaveBeenCalledTimes(2);
      expect(rangeMock).toHaveBeenNthCalledWith(1, 0, 999);
      expect(rangeMock).toHaveBeenNthCalledWith(2, 1000, 1999);

      // Verifies immutable ordering by id to prevent pagination shift
      expect(orderMock).toHaveBeenCalledWith('id', { ascending: true });
    } finally {
      from.mockRestore();
    }
  });

  it('preserves all 1001 customers without duplicates or omissions even if activity changes between pages', async () => {
    // 1001 passes with immutable IDs p-0000 to p-1000
    const mockPasses = Array.from({ length: 1001 }, (_, i) => ({
      id: `p-${String(i).padStart(4, '0')}`,
      customerId: `c-${i}`,
      createdAt: '2026-10-01',
      updatedAt: '2026-10-06T10:00:00Z',
      customer: { name: `Cliente ${i}` },
    }));

    let callCount = 0;
    const rangeMock = vi.fn().mockImplementation((_from: number, _to: number) => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ data: mockPasses.slice(0, 1000), error: null });
      }
      // Between page 1 and page 2, customer p-1000 receives activity (updatedAt updated to NOW)
      mockPasses[1000].updatedAt = '2026-10-27T20:00:00Z';
      return Promise.resolve({ data: mockPasses.slice(1000, 1001), error: null });
    });

    const orderMock = vi.fn().mockReturnValue({
      range: rangeMock,
    });

    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: orderMock,
    };

    const balances = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const scans = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue({
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };

    const from = vi.spyOn(supabase, 'from').mockImplementation(((table: string) => {
      if (table === 'Pass') return passes as any;
      if (table === 'PassStampBalance') return balances as any;
      if (table === 'Scan') return scans as any;
      return {} as any;
    }) as any);

    try {
      const result = await listCustomers('b-1');
      expect(result).toHaveLength(1001);
      const uniqueIds = new Set(result.map((r) => r.passId));
      expect(uniqueIds.size).toBe(1001);
      expect(result[0].passId).toBe('p-1000');
    } finally {
      from.mockRestore();
    }
  });

  it('applies range limit for partial page when explicit limit is smaller than 1000', async () => {
    const rangeMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const orderMock = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        range: rangeMock,
      }),
      range: rangeMock,
    });
    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: orderMock,
    };
    const from = vi.spyOn(supabase, 'from').mockReturnValueOnce(passes as unknown as ReturnType<typeof supabase.from>);
    try {
      await listCustomers('b-1', { limit: 50 });
      expect(rangeMock).toHaveBeenCalledWith(0, 49);
    } finally {
      from.mockRestore();
    }
  });
});

describe('customersService - deletion (Ley 19.628)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteCustomer', () => {
    it('throws error if no active session', async () => {
      vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(deleteCustomer('m-1', 'c-1')).rejects.toThrow(
        'No hay sesión activa para realizar esta acción.',
      );
    });

    it('makes DELETE request with Authorization Bearer header', async () => {
      vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: {
          session: {
            access_token: 'fake-access-token',
          } as any,
        },
        error: null,
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await deleteCustomer('m-1', 'c-1');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/customers/c-1?merchantId=m-1'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer fake-access-token',
          }),
        }),
      );
    });

    it('throws extracted error message on server error', async () => {
      vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: {
          session: {
            access_token: 'fake-access-token',
          } as any,
        },
        error: null,
      });

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            message: 'Solo el dueño del comercio puede eliminar clientes',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      await expect(deleteCustomer('m-1', 'c-1')).rejects.toThrow(
        'Solo el dueño del comercio puede eliminar clientes',
      );
    });
  });
});
