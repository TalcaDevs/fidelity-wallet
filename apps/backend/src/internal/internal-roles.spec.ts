import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { InternalController } from './internal.controller.js';

type Handler = keyof InternalController;

const contextFor = (handler: Handler) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 'u-1' } }) }),
    getHandler: () => InternalController.prototype[handler],
    getClass: () => InternalController,
  }) as unknown as ExecutionContext;

const guardFor = (role: 'SUPERADMIN' | 'SUPPORT') =>
  new PlatformAdminGuard(
    {
      platformAdmin: {
        findUnique: vi.fn().mockResolvedValue({ userId: 'u-1', role }),
      },
    } as unknown as PrismaService,
    new Reflector(),
  );

const SUPERADMIN_ONLY: Handler[] = [
  'updateBrand',
  'updateLocation',
  'revealCustomer',
  'audit',
];
const READ: Handler[] = [
  'summary',
  'me',
  'listBrands',
  'getBrand',
  'locationPins',
  'searchCustomers',
];

describe('roles de InternalController', () => {
  it.each(SUPERADMIN_ONLY)('SUPPORT recibe 403 en %s', async (handler) => {
    await expect(
      guardFor('SUPPORT').canActivate(contextFor(handler)),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      guardFor('SUPERADMIN').canActivate(contextFor(handler)),
    ).resolves.toBe(true);
  });

  it.each(READ)('SUPPORT puede leer %s', async (handler) => {
    await expect(
      guardFor('SUPPORT').canActivate(contextFor(handler)),
    ).resolves.toBe(true);
  });
});
