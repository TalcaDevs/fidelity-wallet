import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { CustomersController } from './customers.controller.js';
import type { CustomersService } from './customers.service.js';
import type { CreateCustomerDto } from './dto/create-customer.dto.js';

describe('CustomersController (Security & Protection)', () => {
  let controller: CustomersController;
  let customersService: Partial<CustomersService>;

  const customerId = '11111111-1111-4111-a111-111111111111';
  const merchantId = '22222222-2222-4222-a222-222222222222';
  const ownerUserId = 'owner-uuid-123';

  beforeEach(() => {
    customersService = {
      createOrFindCustomer: vi.fn(),
      deleteCustomerByMerchant: vi.fn(),
      deleteCustomerGlobal: vi.fn(),
    };

    controller = new CustomersController(customersService as CustomersService);
  });

  describe('Guards Metadata & Route Protection', () => {
    it('applies SupabaseAuthGuard to DELETE :customerId endpoint', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, CustomersController.prototype.deleteCustomer);

      expect(guards).toBeDefined();
      expect(guards).toContain(SupabaseAuthGuard);
    });

    it('does NOT apply SupabaseAuthGuard to POST / (createCustomer must be public for customer acquisition)', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, CustomersController.prototype.createCustomer);

      expect(guards).toBeUndefined();
    });
  });

  describe('DELETE :customerId - Execution & Authorization', () => {
    it('throws UnauthorizedException when user is undefined (unauthenticated call bypass attempt)', async () => {
      await expect(
        controller.deleteCustomer(customerId, merchantId, undefined),
      ).rejects.toThrow(new UnauthorizedException('Usuario no autenticado'));

      expect(customersService.deleteCustomerByMerchant).not.toHaveBeenCalled();
      expect(customersService.deleteCustomerGlobal).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when user has no id', async () => {
      await expect(
        controller.deleteCustomer(customerId, merchantId, {} as any),
      ).rejects.toThrow(new UnauthorizedException('Usuario no autenticado'));

      expect(customersService.deleteCustomerByMerchant).not.toHaveBeenCalled();
    });

    it('delegates to deleteCustomerByMerchant with merchantId and validated callerUserId', async () => {
      const mockResult = {
        deletedPassId: 'pass-uuid',
        deletedCustomerId: customerId,
        customerCompletelyDeleted: false,
        deletedStampsCount: 3,
        deletedScansCount: 4,
      };

      (customersService.deleteCustomerByMerchant as any).mockResolvedValue(mockResult);

      const result = await controller.deleteCustomer(
        customerId,
        merchantId,
        { id: ownerUserId, email: 'owner@local.cl' },
      );

      expect(result).toEqual(mockResult);
      expect(customersService.deleteCustomerByMerchant).toHaveBeenCalledWith(
        merchantId,
        customerId,
        ownerUserId,
      );
    });

    it('propagates ForbiddenException when caller is not the owner of the merchant', async () => {
      (customersService.deleteCustomerByMerchant as any).mockRejectedValue(
        new ForbiddenException('Solo el dueño del comercio puede eliminar clientes de su programa'),
      );

      await expect(
        controller.deleteCustomer(
          customerId,
          merchantId,
          { id: 'not-the-owner-uuid', email: 'attacker@other.cl' },
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(customersService.deleteCustomerByMerchant).toHaveBeenCalledWith(
        merchantId,
        customerId,
        'not-the-owner-uuid',
      );
    });

    it('delegates to deleteCustomerGlobal when merchantId query param is omitted', async () => {
      const mockResult = {
        deletedPassId: null,
        deletedCustomerId: customerId,
        customerCompletelyDeleted: true,
        deletedStampsCount: 0,
        deletedScansCount: 0,
      };

      (customersService.deleteCustomerGlobal as any).mockResolvedValue(mockResult);

      const result = await controller.deleteCustomer(
        customerId,
        undefined,
        { id: ownerUserId, email: 'admin@platform.cl' },
      );

      expect(result).toEqual(mockResult);
      expect(customersService.deleteCustomerGlobal).toHaveBeenCalledWith(customerId);
    });
  });

  describe('POST / - createCustomer', () => {
    it('delegates to customersService.createOrFindCustomer with given DTO', async () => {
      const dto: CreateCustomerDto = {
        merchantId,
        rut: '12.345.678-5',
        phone: '+56912345678',
        acceptedTerms: true,
      };

      const mockResponse = {
        customerId,
        passId: 'pass-123',
        isNew: true,
        appleWalletUrl: 'https://apple.wallet/123',
        googleWalletUrl: 'https://google.wallet/123',
      };

      (customersService.createOrFindCustomer as any).mockResolvedValue(mockResponse);

      const result = await controller.createCustomer(dto);

      expect(result).toEqual(mockResponse);
      expect(customersService.createOrFindCustomer).toHaveBeenCalledWith(dto);
    });
  });
});
