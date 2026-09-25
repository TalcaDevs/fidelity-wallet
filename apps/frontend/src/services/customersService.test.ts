import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  deleteCustomer,
  requestCustomerDeletion,
  verifyCustomerDeletion,
} from './customersService';
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

  describe('requestCustomerDeletion', () => {
    it('sends POST request to deletion request endpoint', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            maskedPhone: '···5678',
            message: 'Código de confirmación enviado por SMS',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const result = await requestCustomerDeletion({
        merchantId: 'm-1',
        phone: '+56912345678',
      });

      expect(result.success).toBe(true);
      expect(result.maskedPhone).toBe('···5678');
    });

    it('returns error when endpoint fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            message: 'No encontramos un pase asociado',
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const result = await requestCustomerDeletion({
        merchantId: 'm-1',
        phone: '+56912345678',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No encontramos un pase asociado');
    });
  });

  describe('verifyCustomerDeletion', () => {
    it('sends POST request to deletion verify endpoint', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            message: 'Tus datos personales y tu tarjeta han sido eliminados de acuerdo con la Ley 19.628.',
            customerCompletelyDeleted: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const result = await verifyCustomerDeletion({
        merchantId: 'm-1',
        phone: '+56912345678',
        code: '123456',
      });

      expect(result.success).toBe(true);
      expect(result.customerCompletelyDeleted).toBe(true);
    });

    it('returns error when verification fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            message: 'El código de verificación ingresado es incorrecto.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      const result = await verifyCustomerDeletion({
        merchantId: 'm-1',
        phone: '+56912345678',
        code: '999999',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('El código de verificación ingresado es incorrecto.');
    });
  });
});
