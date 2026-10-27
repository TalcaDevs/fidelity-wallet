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
      .mockReturnValueOnce(balances as unknown as ReturnType<typeof supabase.from>);
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

    const orderSecondMock = vi.fn().mockReturnValue({
      range: rangeMock,
    });

    const orderFirstMock = vi.fn().mockReturnValue({
      order: orderSecondMock,
      range: rangeMock,
    });

    const passes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: orderFirstMock,
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

      // Verifies deterministic compound ordering by updatedAt and id
      expect(orderFirstMock).toHaveBeenCalledWith('updatedAt', { ascending: false });
      expect(orderSecondMock).toHaveBeenCalledWith('id', { ascending: false });
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
