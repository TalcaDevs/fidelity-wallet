import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteCustomer } from './customersService';
import { supabase } from '../lib/supabase';

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
