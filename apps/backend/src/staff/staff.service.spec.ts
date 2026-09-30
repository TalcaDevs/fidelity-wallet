import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  UserAccessInfo,
  UserDirectoryService,
} from '../common/users/user-directory.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StaffService } from './staff.service.js';

const brandId = 'b0000000-0000-0000-0000-000000000001';
const mainId = brandId;
const secondId = 'a0000000-0000-0000-0000-000000000002';
const ownerId = 'owner-uuid-123';
const staffId = 'staff-uuid-456';

const mainLocation = {
  id: mainId,
  brandId,
  name: 'Centro',
  isActive: true,
  brand: { name: 'Cafetería', status: 'ACTIVE' },
};
const ownerMembership = {
  userId: ownerId,
  brandId,
  merchantId: null,
  role: 'OWNER',
  createdAt: new Date('2026-01-01'),
  merchant: null,
};
const staffMembership = {
  userId: staffId,
  brandId,
  merchantId: mainId,
  role: 'STAFF',
  createdAt: new Date('2026-02-01'),
  merchant: { id: mainId, name: 'Centro' },
};

function access(overrides: Partial<UserAccessInfo> = {}): UserAccessInfo {
  return {
    email: 'mesero@cafeteria.cl',
    createdAt: new Date('2026-02-01T10:00:00Z'),
    lastSignInAt: null,
    emailConfirmedAt: null,
    bannedUntil: null,
    ...overrides,
  };
}

describe('StaffService', () => {
  let service: StaffService;
  let prisma: any;
  let supabase: any;
  let accessById: Map<string, UserAccessInfo>;
  let memberships: Record<string, object | null>;

  beforeEach(() => {
    memberships = { [ownerId]: ownerMembership, [staffId]: staffMembership };
    accessById = new Map();

    prisma = {
      merchant: {
        findUnique: vi.fn(({ where }: any) =>
          Promise.resolve(where.id === mainId ? mainLocation : null),
        ),
      },
      brandMember: {
        findUnique: vi.fn(({ where }: any) =>
          Promise.resolve(memberships[where.userId_brandId.userId] ?? null),
        ),
        findMany: vi.fn().mockResolvedValue([ownerMembership, staffMembership]),
        create: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
        update: vi.fn(({ data }: any) =>
          Promise.resolve({
            ...staffMembership,
            merchantId: data.merchantId,
            merchant: { id: data.merchantId, name: 'Norte' },
          }),
        ),
        count: vi.fn().mockResolvedValue(0),
      },
      brand: { findUnique: vi.fn().mockResolvedValue({ planId: 'BUSINESS' }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      scan: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };

    supabase = {
      auth: {
        admin: {
          createUser: vi.fn(),
          inviteUserByEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
          updateUserById: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    };

    const users = {
      lookupAccess: vi.fn((ids: string[]) =>
        Promise.resolve(
          new Map(
            ids.flatMap((id) =>
              accessById.has(id) ? [[id, accessById.get(id)!] as const] : [],
            ),
          ),
        ),
      ),
    } as unknown as UserDirectoryService;

    const config = {
      get: vi.fn(() => 'x'),
    } as unknown as ConfigService;

    service = new StaffService(prisma as PrismaService, config, users);
    vi.spyOn(service, 'getSupabaseAdmin').mockReturnValue(supabase);
  });

  describe('inviteStaff', () => {
    const invite = (overrides: object = {}, caller = ownerId) =>
      service.inviteStaff(brandId, caller, {
        email: 'mesero@cafeteria.cl',
        locationId: mainId,
        ...overrides,
      });

    it('forbids a STAFF caller', async () => {
      await expect(invite({}, staffId)).rejects.toThrow(
        'Solo el dueño del comercio puede invitar personal',
      );
      expect(supabase.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    });

    it('forbids an unknown location', async () => {
      await expect(invite({ locationId: secondId })).rejects.toThrow(
        ForbiddenException,
      );
      expect(supabase.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    });

    it('forbids a location of another brand, even if the caller owns it', async () => {
      prisma.merchant.findUnique.mockResolvedValue({
        ...mainLocation,
        brandId: 'otra-marca',
      });
      memberships[ownerId] = { ...ownerMembership, brandId: 'otra-marca' };

      await expect(invite()).rejects.toThrow(ForbiddenException);
      expect(supabase.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    });

    it('forbids inviting staff while the brand is suspended', async () => {
      prisma.merchant.findUnique.mockResolvedValue({
        ...mainLocation,
        brand: { name: 'Cafetería', status: 'SUSPENDED' },
      });

      await expect(invite()).rejects.toThrow(
        'Este local no está habilitado para operar',
      );
      expect(supabase.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    });

    it('invites by email and creates the STAFF membership in the chosen location', async () => {
      supabase.auth.admin.inviteUserByEmail.mockResolvedValue({
        data: { user: { id: 'new-user', email: 'mesero@cafeteria.cl' } },
        error: null,
      });

      const result = await invite();

      expect(result).toMatchObject({ id: 'new-user', role: 'STAFF', merchantId: mainId });
      expect(supabase.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
        'mesero@cafeteria.cl',
        { data: { merchant_id: mainId } },
      );
      expect(prisma.brandMember.create).toHaveBeenCalledWith({
        data: { userId: 'new-user', brandId, merchantId: mainId, role: 'STAFF' },
      });
    });

    it('creates the account with a password when one is given', async () => {
      supabase.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-user', email: 'cajero@cafeteria.cl' } },
        error: null,
      });

      await invite({ email: 'cajero@cafeteria.cl', password: 'ClaveSegura2026!' });

      expect(supabase.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'cajero@cafeteria.cl',
        password: 'ClaveSegura2026!',
        email_confirm: true,
        user_metadata: { merchant_id: mainId },
      });
      expect(prisma.brandMember.create).toHaveBeenCalled();
    });

    it('rejects moving an existing member silently (409), but is idempotent for the same local', async () => {
      supabase.auth.admin.inviteUserByEmail.mockResolvedValue({
        data: { user: { id: staffId, email: 'mesero@cafeteria.cl' } },
        error: null,
      });

      memberships[staffId] = { ...staffMembership, merchantId: secondId };
      await expect(invite()).rejects.toThrow(ConflictException);

      memberships[staffId] = { ...staffMembership, role: 'OWNER', merchantId: null };
      await expect(invite()).rejects.toThrow('Ese usuario ya es dueño de la marca');

      memberships[staffId] = staffMembership;
      await expect(invite()).resolves.toMatchObject({ id: staffId });
      expect(prisma.brandMember.create).not.toHaveBeenCalled();
    });

    it('lifts the ban of a previously removed user that is invited again', async () => {
      supabase.auth.admin.inviteUserByEmail.mockResolvedValue({
        data: { user: { id: 'returning', email: 'vuelve@cafeteria.cl' } },
        error: null,
      });
      accessById.set('returning', access({ bannedUntil: new Date('2126-01-01') }));

      await invite({ email: 'vuelve@cafeteria.cl' });

      expect(supabase.auth.admin.updateUserById).toHaveBeenCalledWith('returning', {
        ban_duration: 'none',
      });
    });

    it('does not touch the ban of a brand new user', async () => {
      supabase.auth.admin.inviteUserByEmail.mockResolvedValue({
        data: { user: { id: 'new-user', email: 'mesero@cafeteria.cl' } },
        error: null,
      });
      accessById.set('new-user', access());

      await invite();

      expect(supabase.auth.admin.updateUserById).not.toHaveBeenCalled();
    });

    it('maps a Supabase error to 400', async () => {
      supabase.auth.admin.inviteUserByEmail.mockResolvedValue({
        data: null,
        error: { message: 'User already exists' },
      });

      await expect(invite()).rejects.toThrow(BadRequestException);
    });
  });

  describe('listStaff', () => {
    it('forbids a STAFF caller', async () => {
      await expect(service.listStaff(brandId, staffId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lists the OWNER and the staff with their location and access state', async () => {
      accessById.set(
        ownerId,
        access({
          email: 'owner@test.com',
          lastSignInAt: new Date('2026-09-01T00:00:00Z'),
          emailConfirmedAt: new Date('2026-01-01'),
        }),
      );
      accessById.set(staffId, access());

      const result = await service.listStaff(brandId, ownerId);

      expect(result).toEqual([
        expect.objectContaining({
          userId: ownerId,
          role: 'OWNER',
          locationId: null,
          status: 'ACTIVE',
          canResendInvite: false,
          lastSignInAt: '2026-09-01T00:00:00.000Z',
        }),
        expect.objectContaining({
          userId: staffId,
          email: 'mesero@cafeteria.cl',
          role: 'STAFF',
          locationId: mainId,
          locationName: 'Centro',
          status: 'INVITED',
          canResendInvite: true,
          invitedAt: '2026-02-01T10:00:00.000Z',
          lastSignInAt: null,
        }),
      ]);
    });

    it('never reports a member without an auth account as ACTIVE', async () => {
      accessById.set(ownerId, access());

      const result = await service.listStaff(brandId, ownerId);

      expect(result[1]).toMatchObject({
        userId: staffId,
        email: null,
        status: 'INVITED',
        canResendInvite: false,
      });
    });
  });

  describe('removeStaff', () => {
    it('deletes the membership, audits it and bans the user when no membership is left', async () => {
      await service.removeStaff(brandId, ownerId, staffId);

      expect(prisma.brandMember.delete).toHaveBeenCalledWith({
        where: { userId_brandId: { userId: staffId, brandId } },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorUserId: ownerId,
          actorType: 'OWNER',
          action: 'staff.remove',
          entityId: staffId,
        }),
      });
      expect(supabase.auth.admin.updateUserById).toHaveBeenCalledWith(staffId, {
        ban_duration: '876000h',
      });
    });

    it('does not ban a user that still belongs to another brand', async () => {
      prisma.brandMember.count.mockResolvedValue(1);

      await service.removeStaff(brandId, ownerId, staffId);

      expect(supabase.auth.admin.updateUserById).not.toHaveBeenCalled();
    });

    it('keeps the removal when the ban fails', async () => {
      supabase.auth.admin.updateUserById.mockResolvedValue({
        error: { message: 'boom' },
      });

      await expect(service.removeStaff(brandId, ownerId, staffId)).resolves.toBeUndefined();
      expect(prisma.brandMember.delete).toHaveBeenCalled();
    });

    it('rejects removing the OWNER, oneself, a stranger or being called by STAFF', async () => {
      memberships['other-owner'] = { ...ownerMembership, userId: 'other-owner' };

      await expect(service.removeStaff(brandId, ownerId, ownerId)).rejects.toThrow(
        'No puedes darte de baja a ti mismo',
      );
      await expect(service.removeStaff(brandId, ownerId, 'other-owner')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.removeStaff(brandId, ownerId, 'ghost')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeStaff(brandId, staffId, ownerId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.brandMember.delete).not.toHaveBeenCalled();
    });
  });

  describe('resendInvite', () => {
    it('re-sends the invitation of a staff member that has not confirmed the email', async () => {
      accessById.set(staffId, access());

      await service.resendInvite(brandId, ownerId, staffId);

      expect(supabase.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
        'mesero@cafeteria.cl',
        { data: { merchant_id: mainId } },
      );
    });

    it('responds 409 when the account is already active or was created with a password', async () => {
      accessById.set(staffId, access({ emailConfirmedAt: new Date() }));

      await expect(service.resendInvite(brandId, ownerId, staffId)).rejects.toThrow(
        ConflictException,
      );
      expect(supabase.auth.admin.inviteUserByEmail).not.toHaveBeenCalled();
    });

    it('never re-invites the OWNER', async () => {
      memberships['other-owner'] = { ...ownerMembership, userId: 'other-owner' };

      await expect(
        service.resendInvite(brandId, ownerId, 'other-owner'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reassignStaff', () => {
    it('moves the staff member to another location of the brand and audits it', async () => {
      prisma.merchant.findUnique.mockResolvedValue({
        id: secondId,
        brandId,
        isActive: true,
      });
      accessById.set(staffId, access());

      const result = await service.reassignStaff(brandId, ownerId, staffId, secondId);

      expect(result).toMatchObject({ locationId: secondId, locationName: 'Norte' });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'staff.reassign',
          before: { brandId, merchantId: mainId },
          after: { brandId, merchantId: secondId },
        }),
      });
    });

    it('rejects a location of another brand or an inactive one', async () => {
      prisma.merchant.findUnique.mockResolvedValueOnce({
        id: secondId,
        brandId: 'otra-marca',
        isActive: true,
      });
      await expect(
        service.reassignStaff(brandId, ownerId, staffId, secondId),
      ).rejects.toThrow('El local no pertenece a esta marca');

      prisma.merchant.findUnique.mockResolvedValueOnce({
        id: secondId,
        brandId,
        isActive: false,
      });
      await expect(
        service.reassignStaff(brandId, ownerId, staffId, secondId),
      ).rejects.toThrow('El local está inactivo');
      expect(prisma.brandMember.update).not.toHaveBeenCalled();
    });
  });

  describe('getStaffActivity', () => {
    it('masks the customer phone and is scoped to the brand', async () => {
      prisma.scan.findMany.mockResolvedValue([
        {
          id: 's1',
          type: 'STAMP_ADDED',
          method: 'QR',
          createdAt: new Date('2026-09-30T12:00:00Z'),
          merchant: { name: 'Centro' },
          promotion: null,
          pass: { customer: { phone: '+56912345678' } },
        },
      ]);

      const result = await service.getStaffActivity(brandId, ownerId, staffId);

      expect(result).toEqual([
        {
          id: 's1',
          type: 'STAMP_ADDED',
          method: 'QR',
          createdAt: '2026-09-30T12:00:00.000Z',
          locationName: 'Centro',
          customerPhone: '+56 9 **** 5678',
          promotionName: null,
        },
      ]);
      expect(prisma.scan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { brandId, createdByUserId: staffId },
          take: 50,
        }),
      );
    });
  });
});
