import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { PlatformAdminGuard, PlatformRoles } from './platform-admin.guard.js';

class SupportOnly {
  @PlatformRoles('SUPERADMIN', 'SUPPORT')
  handler() {}

  @PlatformRoles('SUPERADMIN')
  superadminOnly() {}

  undeclared() {}
}

const contextFor = (request: object, handler: keyof SupportOnly = 'handler') =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => SupportOnly.prototype[handler],
    getClass: () => SupportOnly,
  }) as unknown as ExecutionContext;

const guardWith = (admin: object | null) =>
  new PlatformAdminGuard(
    { platformAdmin: { findUnique: vi.fn().mockResolvedValue(admin) } } as unknown as PrismaService,
    new Reflector(),
  );

describe('PlatformAdminGuard', () => {
  it('rejects authenticated users that are not in PlatformAdmin, whatever their metadata says', async () => {
    const request = { user: { id: 'u-1', user_metadata: { platform_admin: true } } };
    await expect(guardWith(null).canActivate(contextFor(request))).rejects.toThrow(ForbiddenException);
  });

  it('rejects requests without an authenticated user', async () => {
    await expect(guardWith({ role: 'SUPERADMIN' }).canActivate(contextFor({}))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('lets allowed roles through and exposes their role', async () => {
    const request: { user: { id: string; platformRole?: string } } = { user: { id: 'u-1' } };
    await expect(
      guardWith({ userId: 'u-1', role: 'SUPPORT' }).canActivate(contextFor(request)),
    ).resolves.toBe(true);
    expect(request.user.platformRole).toBe('SUPPORT');
  });

  it('rejects a role the handler does not allow', async () => {
    await expect(
      guardWith({ userId: 'u-1', role: 'SUPPORT' }).canActivate(
        contextFor({ user: { id: 'u-1' } }, 'superadminOnly'),
      ),
    ).rejects.toThrow('Tu rol del equipo interno no tiene acceso a esta sección');
  });

  it('denies by default when the handler declares no roles', async () => {
    await expect(
      guardWith({ userId: 'u-1', role: 'SUPERADMIN' }).canActivate(
        contextFor({ user: { id: 'u-1' } }, 'undeclared'),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
