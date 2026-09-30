import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { StaffService } from './staff.service.js';

describe('StaffService', () => {
  let service: StaffService;
  let prisma: PrismaService;
  let mockSupabaseAdmin: any;

  const mockMerchantId = 'a0000000-0000-0000-0000-000000000001';
  const mockBrandId = 'b0000000-0000-0000-0000-000000000001';
  const mockOwnerId = 'owner-uuid-123';

  const mockLocation = {
    id: mockMerchantId,
    brandId: mockBrandId,
    name: 'Cafeteria',
    isActive: true,
    brand: { name: 'Cafeteria', status: 'ACTIVE' },
  };
  const ownerMembership = {
    userId: mockOwnerId,
    brandId: mockBrandId,
    merchantId: null,
    role: 'OWNER',
  };

  beforeEach(() => {
    prisma = {
      merchant: {
        findUnique: vi.fn().mockResolvedValue(mockLocation),
      },
      brandMember: {
        findMany: vi.fn(),
        delete: vi.fn(),
        findUnique: vi.fn(({ where }: any) =>
          Promise.resolve(
            where.userId_brandId.userId === mockOwnerId
              ? ownerMembership
              : null,
          ),
        ),
        create: vi.fn().mockResolvedValue({}),
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



  it('should throw ForbiddenException if the location does not exist', async () => {
    vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue(null);

    await expect(
      service.inviteStaff(
        { merchantId: mockMerchantId, email: 'staff@test.com' },
        mockOwnerId,
      ),
    ).rejects.toThrow(NotFoundException);
    expect(
      mockSupabaseAdmin.auth.admin.inviteUserByEmail,
    ).not.toHaveBeenCalled();
  });

  it('should invite staff without password using inviteUserByEmail', async () => {
    mockSupabaseAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: {
        user: {
          id: 'u0000000-0000-0000-0000-000000000002',
          email: 'mesero@cafeteria.cl',
        },
      },
      error: null,
    });

    const result = await service.inviteStaff(
      { merchantId: mockMerchantId, email: 'mesero@cafeteria.cl' },
      mockOwnerId,
    );

    expect(result.id).toBe('u0000000-0000-0000-0000-000000000002');
    expect(result.role).toBe('STAFF');
    expect(mockSupabaseAdmin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      'mesero@cafeteria.cl',
      { data: { merchant_id: mockMerchantId } },
    );
    expect(prisma.brandMember.create).toHaveBeenCalledWith({
      data: {
        userId: 'u0000000-0000-0000-0000-000000000002',
        brandId: mockBrandId,
        merchantId: mockMerchantId,
        role: 'STAFF',
      },
    });
  });

  it('should create staff with password using createUser', async () => {
    mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
      data: {
        user: {
          id: 'u0000000-0000-0000-0000-000000000003',
          email: 'cajero@cafeteria.cl',
        },
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
      user_metadata: { merchant_id: mockMerchantId },
    });
    expect(prisma.brandMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: 'u0000000-0000-0000-0000-000000000003',
          brandId: mockBrandId,
          merchantId: mockMerchantId,
          role: 'STAFF',
        },
      }),
    );
  });

  it('rejects moving an existing member silently (409), but is idempotent for the same local', async () => {
    const invitedId = 'u0000000-0000-0000-0000-000000000004';
    mockSupabaseAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: { user: { id: invitedId, email: 'mesero@cafeteria.cl' } },
      error: null,
    });
    const membershipOf = (existing: object | null) =>
      vi
        .spyOn(prisma.brandMember, 'findUnique')
        .mockImplementation((({ where }: any) =>
          Promise.resolve(
            where.userId_brandId.userId === mockOwnerId
              ? ownerMembership
              : existing,
          )) as any);
    const invite = () =>
      service.inviteStaff(
        { merchantId: mockMerchantId, email: 'mesero@cafeteria.cl' },
        mockOwnerId,
      );

    membershipOf({
      userId: invitedId,
      brandId: mockBrandId,
      role: 'STAFF',
      merchantId: 'otro-local',
    });
    await expect(invite()).rejects.toThrow(ConflictException);

    membershipOf({
      userId: invitedId,
      brandId: mockBrandId,
      role: 'OWNER',
      merchantId: null,
    });
    await expect(invite()).rejects.toThrow(
      'Ese usuario ya es dueño de la marca',
    );

    membershipOf({
      userId: invitedId,
      brandId: mockBrandId,
      role: 'STAFF',
      merchantId: mockMerchantId,
    });
    await expect(invite()).resolves.toMatchObject({
      id: invitedId,
      role: 'STAFF',
    });
    expect(prisma.brandMember.create).not.toHaveBeenCalled();
  });



  it('should throw BadRequestException if Supabase returns error', async () => {
    mockSupabaseAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: null,
      error: { message: 'User already exists' },
    });

    await expect(
      service.inviteStaff(
        { merchantId: mockMerchantId, email: 'duplicate@test.com' },
        mockOwnerId,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  describe('listStaff', () => {
    it('should correctly map listUsers data with Prisma membership data', async () => {
      vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue({
        id: mockMerchantId,
        name: 'Brand Demo',
      } as any);

      vi.spyOn(prisma.brandMember, 'findMany').mockResolvedValue([
        { userId: 'u1', brandId: mockMerchantId, role: 'OWNER', createdAt: new Date('2026-01-01') },
        { userId: 'u2', brandId: mockMerchantId, role: 'STAFF', createdAt: new Date('2026-01-02') },
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
      vi.spyOn(prisma.brandMember, 'findUnique').mockResolvedValue({
        userId: 'u2',
        brandId: mockMerchantId,
        role: 'STAFF',
      } as any);

      vi.spyOn(prisma.brandMember, 'delete').mockResolvedValue({} as any);

      const result = await service.removeStaff(mockMerchantId, 'u2');

      expect(result.success).toBe(true);
      expect(prisma.brandMember.delete).toHaveBeenCalledWith({
        where: { userId_brandId: { userId: 'u2', brandId: mockMerchantId } }
      });
    });

    it('should prevent deleting the owner', async () => {
      vi.spyOn(prisma.brandMember, 'findUnique').mockResolvedValue({
        userId: 'u1',
        brandId: mockMerchantId,
        role: 'OWNER',
      } as any);

      await expect(service.removeStaff(mockMerchantId, 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFound if user is not in merchant', async () => {
      vi.spyOn(prisma.brandMember, 'findUnique').mockResolvedValue(null);

      await expect(service.removeStaff(mockMerchantId, 'ghost')).rejects.toThrow(NotFoundException);
    });
  });
});
