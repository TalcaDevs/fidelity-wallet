import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import type { ScanService } from '../scan/scan.service.js';
import type { CustomerHistoryService } from './customer-history.service.js';
import { CustomersController } from './customers.controller.js';
import type { CustomersService } from './customers.service.js';
import type { CreateCustomerDto } from './dto/create-customer.dto.js';

describe('CustomersController (Security & Protection)', () => {
  let controller: CustomersController;
  let customersService: Partial<CustomersService>;
  let scanService: Pick<ScanService, 'addStampsFromPanel' | 'voidScan'>;

  const customerId = '11111111-1111-4111-a111-111111111111';
  const merchantId = '22222222-2222-4222-a222-222222222222';
  const ownerUserId = 'owner-uuid-123';

  beforeEach(() => {
    customersService = {
      createOrFindCustomer: vi.fn(),
      deleteCustomerByMerchant: vi.fn(),
      deleteCustomerGlobal: vi.fn(),
    };

    scanService = {
      addStampsFromPanel: vi.fn(),
      voidScan: vi.fn(),
    };

    controller = new CustomersController(
      customersService as CustomersService,
      { forOwner: vi.fn() } as unknown as CustomerHistoryService,
      scanService as unknown as ScanService,
    );
  });

  describe('Guards Metadata & Route Protection', () => {
    it('applies SupabaseAuthGuard to DELETE :customerId endpoint', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, CustomersController.prototype.deleteCustomer);

      expect(guards).toBeDefined();
      expect(guards).toContain(SupabaseAuthGuard);
    });

    it('applies SupabaseAuthGuard to POST :customerId/stamps', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, CustomersController.prototype.addStamps);

      expect(guards).toContain(SupabaseAuthGuard);
    });

    it('applies SupabaseAuthGuard to POST :customerId/scans/:scanId/void', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, CustomersController.prototype.voidScan);

      expect(guards).toContain(SupabaseAuthGuard);
    });

    it('applies SupabaseAuthGuard to GET :customerId/history', () => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, CustomersController.prototype.getHistory);

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

    it('always delegates to deleteCustomerByMerchant with mandatory merchantId and does not call deleteCustomerGlobal', async () => {
      const mockResult = {
        deletedPassId: 'pass-uuid',
        deletedCustomerId: customerId,
        customerCompletelyDeleted: false,
        deletedStampsCount: 0,
        deletedScansCount: 0,
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
      expect(customersService.deleteCustomerGlobal).not.toHaveBeenCalled();
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

  describe('POST :customerId/scans/:scanId/void - Execution & Authorization', () => {
    const scanId = '33333333-3333-4333-a333-333333333333';
    const brandId = '44444444-4444-4444-a444-444444444444';
    const dto = {
      brandId,
      reason: 'Error de tipeo en caja, se cargaron sellos de más',
    };

    it('throws UnauthorizedException when user is undefined', async () => {
      await expect(
        controller.voidScan(customerId, scanId, dto, undefined),
      ).rejects.toThrow(new UnauthorizedException('Usuario no autenticado'));
    });

    it('throws UnauthorizedException when user has no id', async () => {
      await expect(
        controller.voidScan(customerId, scanId, dto, {} as any),
      ).rejects.toThrow(new UnauthorizedException('Usuario no autenticado'));
    });

    it('delegates to scanService.voidScan with customerId, scanId, dto and user.id', async () => {
      const mockResult = {
        scanId,
        voidedAt: '2026-10-08T15:00:00.000Z',
        activeStamps: 2,
        activePoints: 0,
        stampsDeducted: 1,
        pointsDeducted: 0,
      };

      vi.mocked(scanService.voidScan).mockResolvedValue(mockResult);

      const result = await controller.voidScan(
        customerId,
        scanId,
        dto,
        { id: ownerUserId, email: 'owner@local.cl' },
      );

      expect(result).toEqual(mockResult);
      expect(scanService.voidScan).toHaveBeenCalledWith(
        customerId,
        scanId,
        dto,
        ownerUserId,
      );
    });
  });
});
