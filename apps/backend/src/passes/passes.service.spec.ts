import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { PassesService } from './passes.service.js';
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

  beforeEach(() => {
    prisma = {
      customer: { findUnique: vi.fn() },
      merchant: { findUnique: vi.fn() },
      pass: { findUnique: vi.fn(), create: vi.fn() },
      promotion: { findFirst: vi.fn() },
      stamp: { count: vi.fn(), findFirst: vi.fn() },
    } as unknown as PrismaService;

    applePassService = {
      getPassUrl: vi.fn((token: string) => `http://localhost:3000/api/passes/${token}/apple`),
      generatePassBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-pkpass-buffer')),
      sendApnsPush: vi.fn().mockResolvedValue(undefined),
    } as unknown as ApplePassService;

    googleWalletService = {
      generateSaveUrl: vi.fn(() => 'https://pay.google.com/gp/v/save/mock-jwt'),
      updateLoyaltyObject: vi.fn().mockResolvedValue(undefined),
    } as unknown as GoogleWalletService;

    service = new PassesService(prisma, applePassService, googleWalletService);
  });

  it('should throw NotFoundException if customer does not exist', async () => {
    vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(null);

    await expect(
      service.generatePass({
        customerId: mockCustomerId,
        merchantId: mockMerchantId,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if merchant does not exist', async () => {
    vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue({ id: mockCustomerId } as any);
    vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue(null);

    await expect(
      service.generatePass({
        customerId: mockCustomerId,
        merchantId: mockMerchantId,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create new pass and return Apple and Google Wallet URLs', async () => {
    vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue({
      id: mockCustomerId,
      rut: '12345678-5',
      phone: '+56912345678',
    } as any);

    vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue({
      id: mockMerchantId,
      name: 'Cafeteria Don Tito',
      stampValidityDays: 30,
    } as any);

    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue(null); // No existing pass

    const mockCreatedPass = {
      id: mockPassId,
      customerId: mockCustomerId,
      merchantId: mockMerchantId,
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

    vi.spyOn(prisma.stamp, 'count').mockResolvedValue(2);
    vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

    const result = await service.generatePass({
      customerId: mockCustomerId,
      merchantId: mockMerchantId,
    });

    expect(result.passId).toBe(mockPassId);
    expect(result.passToken).toBe('mock-entropy-token-12345');
    expect(result.activeStamps).toBe(2);
    expect(result.targetStamps).toBe(10);
    expect(result.rewardName).toBe('Capuccino Gratis');
    expect(result.appleWalletUrl).toContain('mock-entropy-token-12345/apple');
    expect(result.googleWalletUrl).toBe('https://pay.google.com/gp/v/save/mock-jwt');
  });

  it('should return Apple pass buffer', async () => {
    vi.spyOn(prisma.pass, 'findUnique').mockResolvedValue({
      id: mockPassId,
      passToken: 'token-abc',
      merchant: { id: mockMerchantId, name: 'Local' },
      customer: { id: mockCustomerId, rut: '11111111-1' },
    } as any);

    vi.spyOn(prisma.promotion, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.stamp, 'count').mockResolvedValue(0);
    vi.spyOn(prisma.stamp, 'findFirst').mockResolvedValue(null);

    const buffer = await service.getApplePassBuffer('token-abc');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.toString()).toBe('mock-pkpass-buffer');
  });
});
