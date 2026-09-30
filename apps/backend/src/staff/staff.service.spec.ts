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
        findMany: vi.fn(),
        upsert: vi.fn().mockResolvedValue({}),
        delete: vi.fn(),
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
          listUsers: vi.fn(),
        },
      },
    };

    service = new StaffService(prisma, configService);
    vi.spyOn(service, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin);
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
    );

    expect(result.id).toBe('u0000000-0000-0000-0000-000000000002');
    expect(result.role).toBe('STAFF');
    expect(mockSupabaseAdmin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      'mesero@cafeteria.cl',
      { data: { merchant_id: mockMerchantId } },
    );
    // La membresía la crea el backend (no el trigger), siempre como STAFF y sin degradar a nadie
    expect(prisma.merchantUser.upsert).toHaveBeenCalledWith({
      where: { userId_merchantId: { userId: 'u0000000-0000-0000-0000-000000000002', merchantId: mockMerchantId } },
      create: { userId: 'u0000000-0000-0000-0000-000000000002', merchantId: mockMerchantId, role: 'STAFF' },
      update: {},
    });
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
    );

    expect(result.id).toBe('u0000000-0000-0000-0000-000000000003');
    expect(result.role).toBe('STAFF');
    expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'cajero@cafeteria.cl',
      password: 'ClaveSegura2026!',
      email_confirm: true,
      user_metadata: { merchant_id: mockMerchantId },
    });
    expect(prisma.merchantUser.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { userId: 'u0000000-0000-0000-0000-000000000003', merchantId: mockMerchantId, role: 'STAFF' },
      }),
    );
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
      ),
    ).rejects.toThrow(BadRequestException);
  });

  describe('listStaff', () => {
    it('should correctly map listUsers data with Prisma membership data', async () => {
      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue({
        id: mockMerchantId,
        name: 'Brand Demo',
      } as any);

      vi.spyOn(prisma.merchantUser, 'findMany').mockResolvedValue([
        { userId: 'u1', merchantId: mockMerchantId, role: 'OWNER', createdAt: new Date('2026-01-01') },
        { userId: 'u2', merchantId: mockMerchantId, role: 'STAFF', createdAt: new Date('2026-01-02') },
      ] as any[]);

      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: {
          users: [
            { id: 'u1', email: 'owner@test.com', created_at: '2026-01-01T00:00:00Z', last_sign_in_at: '2026-09-01T00:00:00Z' },
            { id: 'u2', email: 'staff@test.com', created_at: '2026-01-02T00:00:00Z', last_sign_in_at: null },
          ]
        },
        error: null,
      });

      const result = await service.listStaff(mockMerchantId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        userId: 'u1',
        email: 'owner@test.com',
        role: 'OWNER',
        status: 'ACTIVE',
        locationName: 'Brand Demo',
      }));
      expect(result[1]).toEqual(expect.objectContaining({
        userId: 'u2',
        email: 'staff@test.com',
        role: 'STAFF',
        status: 'INVITED',
        lastSignInAt: null,
      }));
    });
  });

  describe('removeStaff', () => {
    it('should delete a staff member', async () => {
      vi.spyOn(prisma.merchantUser, 'findUnique').mockResolvedValue({
        id: 'mu-2',
        userId: 'u2',
        merchantId: mockMerchantId,
        role: 'STAFF',
      } as any);

      vi.spyOn(prisma.merchantUser, 'delete').mockResolvedValue({} as any);

      const result = await service.removeStaff(mockMerchantId, 'u2');

      expect(result.success).toBe(true);
      expect(prisma.merchantUser.delete).toHaveBeenCalledWith({
        where: { userId_merchantId: { userId: 'u2', merchantId: mockMerchantId } }
      });
    });

    it('should prevent deleting the owner', async () => {
      vi.spyOn(prisma.merchantUser, 'findUnique').mockResolvedValue({
        id: 'mu-1',
        userId: 'u1',
        merchantId: mockMerchantId,
        role: 'OWNER',
      } as any);

      await expect(service.removeStaff(mockMerchantId, 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFound if user is not in merchant', async () => {
      vi.spyOn(prisma.merchantUser, 'findUnique').mockResolvedValue(null);

      await expect(service.removeStaff(mockMerchantId, 'ghost')).rejects.toThrow(NotFoundException);
    });
  });
});
