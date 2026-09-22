import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { StaffService } from './staff.service.js';

describe('StaffService', () => {
  let service: StaffService;
  let prisma: PrismaService;
  let mockSupabaseAdmin: any;

  beforeEach(() => {
    prisma = {
      merchant: {
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

    service = new StaffService(prisma, configService);

    mockSupabaseAdmin = {
      auth: {
        admin: {
          createUser: vi.fn(),
          inviteUserByEmail: vi.fn(),
        },
      },
    };

    service.setSupabaseAdmin(mockSupabaseAdmin);
  });

  it('should throw NotFoundException if merchant does not exist', async () => {
    vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue(null);

    await expect(
      service.inviteStaff({
        merchantId: 'a0000000-0000-0000-0000-000000000001',
        email: 'staff@test.com',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should invite staff without password using inviteUserByEmail', async () => {
    vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue({
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Cafeteria',
      email: 'owner@test.com',
      stampValidityDays: null,
      createdAt: new Date(),
    } as any);

    mockSupabaseAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: {
        user: {
          id: 'user-uuid-123',
          email: 'staff@test.com',
        },
      },
      error: null,
    });

    const result = await service.inviteStaff({
      merchantId: 'a0000000-0000-0000-0000-000000000001',
      email: 'staff@test.com',
    });

    expect(mockSupabaseAdmin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      'staff@test.com',
      {
        data: {
          merchant_id: 'a0000000-0000-0000-0000-000000000001',
          role: 'STAFF',
        },
      },
    );

    expect(result.id).toBe('user-uuid-123');
    expect(result.role).toBe('STAFF');
    expect(result.email).toBe('staff@test.com');
  });

  it('should create staff with password using createUser', async () => {
    vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue({
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Cafeteria',
      email: 'owner@test.com',
      stampValidityDays: null,
      createdAt: new Date(),
    } as any);

    mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-uuid-456',
          email: 'staff2@test.com',
        },
      },
      error: null,
    });

    const result = await service.inviteStaff({
      merchantId: 'a0000000-0000-0000-0000-000000000001',
      email: 'staff2@test.com',
      password: 'SecretPassword123!',
    });

    expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'staff2@test.com',
      password: 'SecretPassword123!',
      email_confirm: true,
      user_metadata: {
        merchant_id: 'a0000000-0000-0000-0000-000000000001',
        role: 'STAFF',
      },
    });

    expect(result.id).toBe('user-uuid-456');
    expect(result.role).toBe('STAFF');
  });

  it('should throw BadRequestException if Supabase returns error', async () => {
    vi.spyOn(prisma.merchant, 'findUnique').mockResolvedValue({
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Cafeteria',
      email: 'owner@test.com',
      stampValidityDays: null,
      createdAt: new Date(),
    } as any);

    mockSupabaseAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' },
    });

    await expect(
      service.inviteStaff({
        merchantId: 'a0000000-0000-0000-0000-000000000001',
        email: 'duplicate@test.com',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
