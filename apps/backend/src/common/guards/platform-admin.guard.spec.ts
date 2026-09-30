import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { PlatformAdminGuard } from './platform-admin.guard.js';

const contextFor = (request: object) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

const guardWith = (admin: object | null) =>
  new PlatformAdminGuard({
    platformAdmin: { findUnique: vi.fn().mockResolvedValue(admin) },
  } as unknown as PrismaService);

describe('PlatformAdminGuard', () => {
  it('rejects authenticated users that are not in PlatformAdmin, whatever their metadata says', async () => {
    const request = {
      user: { id: 'u-1', user_metadata: { platform_admin: true } },
    };
    await expect(
      guardWith(null).canActivate(contextFor(request)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects requests without an authenticated user', async () => {
    await expect(
      guardWith({ role: 'SUPERADMIN' }).canActivate(contextFor({})),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lets platform admins through and exposes their role', async () => {
    const request: { user: { id: string; platformRole?: string } } = {
      user: { id: 'u-1' },
    };
    await expect(
      guardWith({ userId: 'u-1', role: 'SUPPORT' }).canActivate(
        contextFor(request),
      ),
    ).resolves.toBe(true);
    expect(request.user.platformRole).toBe('SUPPORT');
  });
});
