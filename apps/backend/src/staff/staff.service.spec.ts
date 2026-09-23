import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { StaffService } from './staff.service.js';

describe('StaffService', () => {
  let service: StaffService;
  let prisma: PrismaService;
  let mockSupabaseAdmin: any;

  const mockMerchantId = 'a0000000-0000-0000-0000-000000000001';
  const mockOwnerId = 'owner-uuid-123';

  beforeEach(() => {
    prisma = {
      merchant: {
        findUnique: vi.fn(),
      },
      merchantUser: {
        findUnique: vi.fn(),
      },
    } as unknown as PrismaService;

    const configService = {
      get: vi.fn((key: string) => {
        if (key === 'SUPABASE_URL') return 'http://127.0.0.1:54321';
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'test-service-key';
        return null;
      }),
    } as unknown as ConfigService;

    mockSupabaseAdmin = {
      auth: {
        admin: {
          createUser: vi.fn(),
          inviteUserByEmail: vi.fn(),
        },
      },
    };

    service = new StaffService(prisma, configService);
    vi.spyOn(service, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin);
  });

  it('should throw UnauthorizedException if callerUserId is missing', async () => {
    await expect(
      service.inviteStaff(
        {
          merchantId: mockMerchantId,
          email: 'staff@test.com',
        },
        '',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException if caller is not an OWNER of the merchant', async () => {
    vi.spyOn(prisma.merchantUser, 'findUnique').mockResolvedValue({
      id: 'mu-1',
      userId: 'caller-staff',
      merchantId: mockMerchantId,
      role: 'STAFF', // Not OWNER!
      createdAt: new Date(),
    } as any);

    await expect(
      service.inviteStaff(
        {
          merchantId: mockMerchantId,
          email: 'newstaff@test.com',
        },
        'caller-staff',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException if merchant does not exist', async () => {
    vi.spyOn(prisma.merchantUser, 'findUnique').mockResolvedValue({
      id: 'mu-owner',
      userId: mockOwnerId,
      merchantId: mockMerchantId,
      role: 'OWNER',
      createdAt: new Date(),
    } as any);

    vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue(null);

    await expect(
      service.inviteStaff(
        {
          merchantId: mockMerchantId,
          email: 'staff@test.com',
        },
        mockOwnerId,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should invite staff without password using inviteUserByEmail', async () => {
    vi.spyOn(prisma.merchantUser, 'findUnique').mockResolvedValue({
      id: 'mu-owner',
      userId: mockOwnerId,
      merchantId: mockMerchantId,
      role: 'OWNER',
      createdAt: new Date(),
    } as any);

    vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue({
      id: mockMerchantId,
      name: 'Cafeteria',
      email: 'owner@test.com',
      stampValidityDays: null,
    } as any);

    mockSupabaseAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: {
        user: { id: 'u0000000-0000-0000-0000-000000000002', email: 'mesero@cafeteria.cl' },
      },
      error: null,
    });

    const result = await service.inviteStaff(
      {
        merchantId: mockMerchantId,
        email: 'mesero@cafeteria.cl',
      },
      mockOwnerId,
    );

    expect(result.id).toBe('u0000000-0000-0000-0000-000000000002');
    expect(result.role).toBe('STAFF');
    expect(mockSupabaseAdmin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      'mesero@cafeteria.cl',
      {
        data: {
          merchant_id: mockMerchantId,
          role: 'STAFF',
        },
      },
    );
  });

  it('should create staff with password using createUser', async () => {
    vi.spyOn(prisma.merchantUser, 'findUnique').mockResolvedValue({
      id: 'mu-owner',
      userId: mockOwnerId,
      merchantId: mockMerchantId,
      role: 'OWNER',
      createdAt: new Date(),
    } as any);

    vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue({
      id: mockMerchantId,
      name: 'Cafeteria',
      email: 'owner@test.com',
    } as any);

    mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
      data: {
        user: { id: 'u0000000-0000-0000-0000-000000000003', email: 'cajero@cafeteria.cl' },
      },
      error: null,
    });

    const result = await service.inviteStaff(
      {
        merchantId: mockMerchantId,
        email: 'cajero@cafeteria.cl',
        password: 'ClaveSegura2026!',
      },
      mockOwnerId,
    );

    expect(result.id).toBe('u0000000-0000-0000-0000-000000000003');
    expect(result.role).toBe('STAFF');
    expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'cajero@cafeteria.cl',
      password: 'ClaveSegura2026!',
      email_confirm: true,
      user_metadata: {
        merchant_id: mockMerchantId,
        role: 'STAFF',
      },
    });
  });

  it('should throw BadRequestException if Supabase returns error', async () => {
    vi.spyOn(prisma.merchantUser, 'findUnique').mockResolvedValue({
      id: 'mu-owner',
      userId: mockOwnerId,
      merchantId: mockMerchantId,
      role: 'OWNER',
      createdAt: new Date(),
    } as any);

    vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue({
      id: mockMerchantId,
      name: 'Cafeteria',
      email: 'owner@test.com',
    } as any);

    mockSupabaseAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: null,
      error: { message: 'User already exists' },
    });

    await expect(
      service.inviteStaff(
        {
          merchantId: mockMerchantId,
          email: 'duplicate@test.com',
        },
        mockOwnerId,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
