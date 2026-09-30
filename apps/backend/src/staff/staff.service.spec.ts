import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
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
        },
      },
    };

    service = new StaffService(prisma, configService);
    vi.spyOn(service, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin);
  });

  it('should throw UnauthorizedException if callerUserId is missing', async () => {
    await expect(
      service.inviteStaff(
        { merchantId: mockMerchantId, email: 'staff@test.com' },
        '',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException if caller is not an OWNER of the brand', async () => {
    vi.spyOn(prisma.brandMember, 'findUnique').mockResolvedValue({
      userId: 'caller-staff',
      brandId: mockBrandId,
      merchantId: mockMerchantId,
      role: 'STAFF',
    } as any);

    await expect(
      service.inviteStaff(
        { merchantId: mockMerchantId, email: 'newstaff@test.com' },
        'caller-staff',
      ),
    ).rejects.toThrow('Solo el dueño del comercio puede invitar personal');
  });

  it('should throw ForbiddenException if the location does not exist', async () => {
    vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue(null);

    await expect(
      service.inviteStaff(
        { merchantId: mockMerchantId, email: 'staff@test.com' },
        mockOwnerId,
      ),
    ).rejects.toThrow(ForbiddenException);
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

  it('forbids inviting staff while the brand is suspended', async () => {
    vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue({
      ...mockLocation,
      brand: { name: 'Cafeteria', status: 'SUSPENDED' },
    } as any);

    await expect(
      service.inviteStaff(
        { merchantId: mockMerchantId, email: 'x@test.com' },
        mockOwnerId,
      ),
    ).rejects.toThrow('Este local no está habilitado para operar');
    expect(
      mockSupabaseAdmin.auth.admin.inviteUserByEmail,
    ).not.toHaveBeenCalled();
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
});
