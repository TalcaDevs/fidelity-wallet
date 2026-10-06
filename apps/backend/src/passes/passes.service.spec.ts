import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma, type LoyaltyProgram, type Pass } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { PassesService, passCustomerLabel } from './passes.service.js';
import { ApplePassService } from './services/apple-pass.service.js';
import { GoogleWalletService } from './services/google-wallet.service.js';

describe('PassesService', () => {
  let service: PassesService;
  let prisma: PrismaService;
  let applePassService: ApplePassService;
  let googleWalletService: GoogleWalletService;

  const mockCustomerId = 'c0000000-0000-0000-0000-000000000001';
  const mockMerchantId = 'a0000000-0000-0000-0000-000000000001';
  const mockPassId = 'p0000000-0000-0000-0000-000000000001';
  const mockUserId = 'u0000000-0000-0000-0000-000000000001';
  const mockProgramId = 'b0000000-0000-0000-0000-000000000001';

  const mockTarget = {
    programId: mockProgramId,
    brandId: mockMerchantId,
    merchantId: mockMerchantId,
  };

  const mockLocation = {
    id: mockMerchantId,
    brandId: mockMerchantId,
    name: 'Cafeteria Don Tito',
    isActive: true,
    brand: { name: 'Cafeteria Don Tito', status: 'ACTIVE' },
  };

  const ownerMembership = {
    userId: mockUserId,
    brandId: mockMerchantId,
    merchantId: null,
    role: 'OWNER',
  };

  const createMockPass = (overrides: Record<string, unknown> = {}) => ({
    id: mockPassId,
    passToken: 'token-abc',
    merchantId: mockMerchantId,
    programId: mockProgramId,
    brand: { id: mockMerchantId, name: 'Cafeteria Don Tito' },
    customer: { id: mockCustomerId, rut: '11111111-1', phone: '+56912345678' },
    ...overrides,
  });

  const createMockPromotion = (overrides: Record<string, unknown> = {}) => ({
    id: 'promo-1',
    programId: mockProgramId,
    targetStamps: 5,
    rewardName: 'Café',
    isActive: true,
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      customer: { findUnique: vi.fn() },
      merchant: {
        findUnique: vi.fn().mockResolvedValue(mockLocation),
        findMany: vi.fn().mockResolvedValue([{ latitude: -33.4, longitude: -70.6 }]),
      },
      brandMember: { findUnique: vi.fn() },
      brand: {
        findUnique: vi.fn().mockResolvedValue({ id: mockMerchantId, name: 'Cafeteria Don Tito' }),
      },
      loyaltyProgram: {
        findFirst: vi.fn().mockResolvedValue({
          id: mockProgramId,
          brandId: mockMerchantId,
          isActive: true,
        }),
        findUnique: vi.fn().mockResolvedValue({
          id: mockProgramId,
          brandId: mockMerchantId,
          type: 'STAMPS',
          name: 'Tarjeta de sellos',
          isActive: true,
          design: {},
          details: {},
          registration: {},
          designVersion: 1,
          brand: { name: 'Cafeteria Don Tito' },
        }),
      },
      pass: {
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn<PrismaService['pass']['findMany']>().mockResolvedValue([]),
      },
      promotion: { findFirst: vi.fn(), findMany: vi.fn() },
      stamp: { count: vi.fn(), findFirst: vi.fn() },
    } as unknown as PrismaService;

    applePassService = {
      getPassUrl: vi.fn((token: string) => `http://localhost:3000/api/passes/${token}/apple`),
      generatePassBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-pkpass-buffer')),
    } as unknown as ApplePassService;

    googleWalletService = {
      generateSaveUrl: vi.fn(() => 'https://pay.google.com/gp/v/save/mock-jwt'),
      updateLoyaltyObject: vi.fn().mockResolvedValue(undefined),
      upsertLoyaltyClass: vi.fn<GoogleWalletService['upsertLoyaltyClass']>()
        .mockResolvedValue(undefined),
    } as unknown as GoogleWalletService;

    service = new PassesService(prisma, applePassService, googleWalletService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generatePass', () => {
    it('should throw UnauthorizedException if callerUserId is missing or empty', async () => {
      await expect(
        service.generatePass(
          {
            customerId: mockCustomerId,
            merchantId: mockMerchantId,
          },
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('does not let a STAFF issue passes (it would expose another customer wallet links)', async () => {
      vi.spyOn(prisma.brandMember, 'findUnique').mockResolvedValue({
        userId: mockUserId,
        brandId: mockMerchantId,
        merchantId: mockMerchantId,
        role: 'STAFF',
      } as any);

      await expect(
        service.generatePass({ customerId: mockCustomerId, merchantId: mockMerchantId }, mockUserId),
      ).rejects.toThrow('Solo el dueño del comercio puede emitir pases manualmente');
      expect(prisma.pass.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if callerUserId is not a member of the merchant', async () => {
      vi.spyOn(prisma.brandMember, 'findUnique').mockResolvedValue(null);

      await expect(
        service.generatePass(
          {
            customerId: mockCustomerId,
            merchantId: mockMerchantId,
          },
          'unauthorized-user',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      vi.spyOn(prisma.brandMember, 'findUnique').mockResolvedValue(ownerMembership as any);
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(null);

      await expect(
        service.generatePass(
          {
            customerId: mockCustomerId,
            merchantId: mockMerchantId,
          },
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if the location does not exist (same as a foreign one)', async () => {
      vi.spyOn(prisma.brandMember, 'findUnique').mockResolvedValue(ownerMembership as any);
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue({ id: mockCustomerId } as any);
      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue(null);

      await expect(
        service.generatePass(
          {
            customerId: mockCustomerId,
            merchantId: mockMerchantId,
          },
          mockUserId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if merchant has no active promotion', async () => {
      vi.spyOn(prisma.brandMember, 'findUnique').mockResolvedValue(ownerMembership as any);
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue({ id: mockCustomerId } as any);
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue({ id: mockPassId } as any);
      vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(null);

      await expect(
        service.generatePass(
          {
            customerId: mockCustomerId,
            merchantId: mockMerchantId,
          },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create new pass and return Apple and Google Wallet URLs', async () => {
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue({
        id: mockCustomerId,
        rut: '12345678-5',
        phone: '+56912345678',
      } as any);

      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(null); // No existing pass

      const mockCreatedPass = {
        id: mockPassId,
        customerId: mockCustomerId,
        ...mockTarget,
        passToken: 'mock-entropy-token-12345',
      };
      vi.spyOn(prisma.pass, 'create').mockResolvedValue(mockCreatedPass as any);

      vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue({
        id: 'promo-1',
        merchantId: mockMerchantId,
        targetStamps: 10,
        rewardName: 'Capuccino Gratis',
        isActive: true,
      } as any);

      vi.spyOn(prisma.brandMember, 'findUnique').mockResolvedValue(ownerMembership as any);

      vi.spyOn(prisma.stamp, 'count').mockResolvedValue(2);
      vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

      const result = await service.generatePass(
        {
          customerId: mockCustomerId,
          merchantId: mockMerchantId,
        },
        mockUserId,
      );

      expect(result.passId).toBe(mockPassId);
      expect(result.passToken).toBe('mock-entropy-token-12345');
      expect(result.activeStamps).toBe(2);
      expect(result.targetStamps).toBe(10);
      expect(result.rewardName).toBe('Capuccino Gratis');
      expect(result.appleWalletUrl).toContain('mock-entropy-token-12345/apple');
      expect(result.googleWalletUrl).toBe('https://pay.google.com/gp/v/save/mock-jwt');

      expect(prisma.pass.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ customerId: mockCustomerId, ...mockTarget }),
      });
      expect(googleWalletService.generateSaveUrl).toHaveBeenCalledWith(
        expect.objectContaining({ programId: mockProgramId, merchantName: 'Cafeteria Don Tito' }),
      );
    });
  });

  describe('findOrCreatePass', () => {
    it('should return existing pass if it exists', async () => {
      const existing = { id: 'pass-existing', customerId: mockCustomerId, merchantId: mockMerchantId };
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(existing as any);

      const res = await service.findOrCreatePass(mockCustomerId, mockTarget);
      expect(res.isNew).toBe(false);
      expect(res.pass.id).toBe('pass-existing');
    });

    it('should create new pass with 64-char hex passToken (32 bytes entropy)', async () => {
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.pass, 'create').mockImplementation(((args: any) => {
        expect(args.data.passToken).toHaveLength(64);
        return Promise.resolve({ id: 'new-pass', ...args.data });
      }) as any);

      const res = await service.findOrCreatePass(mockCustomerId, mockTarget);
      expect(res.isNew).toBe(true);
      expect(res.pass.id).toBe('new-pass');
    });

    it('should use transaction client tx when provided', async () => {
      const txMock: any = {
        pass: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 'tx-pass-1' }),
        },
      };

      const res = await service.findOrCreatePass(mockCustomerId, mockTarget, txMock);
      expect(txMock.pass.findUnique).toHaveBeenCalled();
      expect(txMock.pass.create).toHaveBeenCalled();
      expect(res.pass.id).toBe('tx-pass-1');
      expect(res.isNew).toBe(true);
    });

    it('rethrows P2002 error when tx is provided so outer transaction can abort and retry', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });
      const txMock: any = {
        pass: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockRejectedValue(p2002Error),
        },
      };

      await expect(
        service.findOrCreatePass(mockCustomerId, mockTarget, txMock),
      ).rejects.toThrow(p2002Error);

      expect(txMock.pass.findUnique).toHaveBeenCalledTimes(1);
      expect(txMock.pass.create).toHaveBeenCalledTimes(1);
    });

    it('catches P2002 and fetches existing pass when tx is not provided', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      });
      const existing = { id: 'pass-concurrent', customerId: mockCustomerId, merchantId: mockMerchantId };

      vi.spyOn(prisma.pass, 'findUnique')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing as any);
      vi.spyOn(prisma.pass, 'create').mockRejectedValueOnce(p2002Error);

      const res = await service.findOrCreatePass(mockCustomerId, mockTarget);

      expect(res.isNew).toBe(false);
      expect(res.pass.id).toBe('pass-concurrent');
      expect(prisma.pass.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('getWalletUrlsForPass', () => {
    it('should return appleWalletUrl and googleWalletUrl for pass', async () => {
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(
        createMockPass({ passToken: 'token-123' }) as any,
      );
      vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(createMockPromotion() as any);
      vi.spyOn(prisma.stamp, 'count').mockResolvedValue(0);
      vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

      const urls = await service.getWalletUrlsForPass(mockPassId);
      expect(urls).not.toBeNull();
      expect(urls?.appleWalletUrl).toContain('/api/passes/token-123/apple');
      expect(urls?.googleWalletUrl).toBe('https://pay.google.com/gp/v/save/mock-jwt');
    });

    it('should use transaction client tx when provided', async () => {
      const txMock: any = {
        pass: {
          findUnique: vi.fn().mockResolvedValue(
            createMockPass({ passToken: 'token-tx' }),
          ),
        },
        promotion: {
          findFirst: vi.fn().mockResolvedValue(createMockPromotion()),
        },
        stamp: {
          count: vi.fn().mockResolvedValue(0),
          findFirst: vi.fn().mockResolvedValue(null),
        },
        loyaltyProgram: prisma.loyaltyProgram,
        merchant: prisma.merchant,
      };

      const urls = await service.getWalletUrlsForPass(mockPassId, txMock);
      expect(txMock.pass.findUnique).toHaveBeenCalled();
      expect(txMock.promotion.findFirst).toHaveBeenCalled();
      expect(urls?.appleWalletUrl).toContain('/api/passes/token-tx/apple');
    });

    it('should return null if pass does not exist', async () => {
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(null);
      const urls = await service.getWalletUrlsForPass('non-existent');
      expect(urls).toBeNull();
    });
  });

  describe('getApplePassBuffer', () => {
    it('should throw BadRequestException if no active promotion', async () => {
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(createMockPass() as any);
      vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(null);

      await expect(service.getApplePassBuffer('token-abc')).rejects.toThrow(BadRequestException);
    });

    it('should return Apple pass buffer when valid pass and promotion exist', async () => {
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(createMockPass() as any);
      vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(createMockPromotion() as any);
      vi.spyOn(prisma.stamp, 'count').mockResolvedValue(0);
      vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

      const buffer = await service.getApplePassBuffer('token-abc');
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.toString()).toBe('mock-pkpass-buffer');
    });
  });

  describe('notifyPassUpdate', () => {
    it('dispatches updateLoyaltyObject with passId, activeStamps and options', async () => {
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(createMockPass() as any);
      vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(createMockPromotion() as any);
      vi.spyOn(prisma.stamp, 'count').mockResolvedValue(3);
      vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

      await service.notifyPassUpdate(mockPassId);

      expect(googleWalletService.updateLoyaltyObject).toHaveBeenCalledWith(
        expect.objectContaining({
          passId: mockPassId,
          activeStamps: 3,
          targetStamps: 5,
          rewardName: 'Café',
          cardClass: expect.objectContaining({ brandName: 'Cafeteria Don Tito', locations: [] }),
        }),
      );
    });

    it('returns early when pass does not exist', async () => {
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(null);

      await service.notifyPassUpdate('non-existent-pass');

      expect(googleWalletService.updateLoyaltyObject).not.toHaveBeenCalled();
    });

    it('serializes rapid consecutive updates for the same pass in FIFO order', async () => {
      const executionOrder: string[] = [];

      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(createMockPass() as any);
      vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(createMockPromotion() as any);
      vi.spyOn(prisma.stamp, 'count')
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);

      vi.spyOn(googleWalletService, 'updateLoyaltyObject').mockImplementation(async (data) => {
        executionOrder.push(`update-${data.activeStamps}`);
      });

      // Disparamos dos actualizaciones simultáneas para el mismo passId
      const p1 = service.notifyPassUpdate(mockPassId);
      const p2 = service.notifyPassUpdate(mockPassId);

      await Promise.all([p1, p2]);

      expect(executionOrder).toEqual(['update-5', 'update-0']);
    });

    it('selects reached promotion over higher unreached target when multiple promotions exist', async () => {
      vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(createMockPass() as any);

      vi.spyOn(prisma.promotion, 'findMany').mockResolvedValue([
        createMockPromotion({ id: 'promo-cafe', targetStamps: 5, rewardName: 'Café' }),
        createMockPromotion({ id: 'promo-almuerzo', targetStamps: 10, rewardName: 'Almuerzo' }),
      ] as any);

      vi.spyOn(prisma.stamp, 'count').mockResolvedValue(6);

      await service.notifyPassUpdate(mockPassId);

      expect(googleWalletService.updateLoyaltyObject).toHaveBeenCalledWith(
        expect.objectContaining({
          passId: mockPassId,
          activeStamps: 6,
          targetStamps: 5,
          rewardName: 'Café',
        }),
      );
    });
  });

  describe('publishCard', () => {
    const publishedPass = (id: string): Pass => ({
      id,
      customerId: mockCustomerId,
      ...mockTarget,
      passToken: `token-${id}`,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });

    it('publishes the class and refreshes every issued pass', async () => {
      vi.mocked(prisma.pass.findMany)
        .mockResolvedValueOnce([publishedPass('p-1'), publishedPass('p-2')])
        .mockResolvedValueOnce([]);
      const notify = vi.spyOn(service, 'notifyPassUpdate').mockResolvedValue(undefined);

      await service.publishCard(mockProgramId);

      expect(googleWalletService.upsertLoyaltyClass).toHaveBeenCalledWith(
        expect.objectContaining({
          programId: mockProgramId,
          brandName: 'Cafeteria Don Tito',
          locations: [{ latitude: -33.4, longitude: -70.6 }],
        }),
      );
      expect(notify.mock.calls.map(([id]) => id)).toEqual(['p-1', 'p-2']);
    });

    it('does not overlap two publications of the same card: the second runs once, after', async () => {
      const order: string[] = [];
      let release!: () => void;
      vi.mocked(googleWalletService.upsertLoyaltyClass)
        .mockImplementationOnce(() => new Promise<void>((r) => (release = () => { order.push('first'); r(); })))
        .mockImplementation(async () => { order.push('again'); });

      const first = service.publishCard(mockProgramId);
      await new Promise((r) => setTimeout(r, 0));
      void service.publishCard(mockProgramId);
      void service.publishCard(mockProgramId);
      release();
      await first;

      expect(order).toEqual(['first', 'again']);
    });

    it('only republishes the class for location changes, and only with nearby notifications on', async () => {
      vi.mocked(prisma.pass.findMany).mockResolvedValue([publishedPass('p-1')]);
      const notify = vi.spyOn(service, 'notifyPassUpdate').mockResolvedValue(undefined);

      await service.refreshNearbyLocations(mockMerchantId);
      expect(googleWalletService.upsertLoyaltyClass).not.toHaveBeenCalled();

      const nearbyProgram: LoyaltyProgram = {
        id: mockProgramId,
        brandId: mockMerchantId,
        type: 'STAMPS',
        stampsEnabled: true,
        pointsEnabled: false,
        allowMultipleRedemptionsPerVisit: true,
        scope: 'BRAND',
        name: 'Tarjeta de sellos',
        stampValidityDays: null,
        isActive: true,
        welcomeBalance: 0,
        dailyStampLimit: true,
        cardValidity: 'UNLIMITED',
        cardExpiresAt: null,
        cardValidityDays: null,
        design: {},
        details: { nearbyNotifications: true },
        registration: {},
        designVersion: 1,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      };
      vi.spyOn(prisma.loyaltyProgram, 'findFirst').mockResolvedValue(nearbyProgram);
      await service.refreshNearbyLocations(mockMerchantId);
      expect(googleWalletService.upsertLoyaltyClass).toHaveBeenCalledTimes(1);
      expect(notify).not.toHaveBeenCalled();
    });

    it('never throws: it runs in the background after saving', async () => {
      vi.spyOn(prisma.loyaltyProgram, 'findUnique').mockRejectedValue(new Error('db down'));
      await expect(service.publishCard(mockProgramId)).resolves.toBeUndefined();
    });
  });
});

describe('passCustomerLabel', () => {
  const base = { name: null, phone: null, email: null, rut: null } as never;

  it('shows the first name, or a masked identifier when there is none', () => {
    expect(passCustomerLabel({ ...(base as object), name: 'María José Pérez', phone: '+56912345678' } as never)).toBe('María');
    expect(passCustomerLabel({ ...(base as object), phone: '+56912345678', rut: '12345678-5' } as never)).toBe('+56 9 **** 5678');
    expect(passCustomerLabel({ ...(base as object), email: 'maria@gmail.com' } as never)).toBe('m***@gmail.com');
    expect(passCustomerLabel({ ...(base as object), rut: '12345678-5' } as never)).toBe('12.***.*78-5');
    expect(passCustomerLabel(null)).toBe('Cliente');
  });
});
