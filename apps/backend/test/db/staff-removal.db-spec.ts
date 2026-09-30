import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { resolveLocationAccess } from '../../src/common/access/brand-access.js';
import type { UserDirectoryService } from '../../src/common/users/user-directory.service.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { StaffService } from '../../src/staff/staff.service.js';
import { as, createBrand, inRollback, prisma, type Tx } from './db-helpers.js';

afterAll(async () => {
  await prisma.$disconnect();
});

/** El servicio abre sus propias transacciones: dentro del test corren sobre la del rollback. */
function onTx(tx: Tx): PrismaService {
  return new Proxy(tx, {
    get: (target, key) =>
      key === '$transaction'
        ? (fn: (t: Tx) => Promise<unknown>) => fn(tx)
        : Reflect.get(target, key),
  }) as unknown as PrismaService;
}

describe('Baja de personal (HANDOFF §6.4)', () => {
  it('un mesero dado de baja recibe 403 en el siguiente escaneo y deja de ver los datos de la marca', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'baja');
      const updateUserById = vi.fn().mockResolvedValue({ error: null });
      const service = new StaffService(
        onTx(tx),
        { get: () => undefined } as unknown as ConfigService,
        {} as UserDirectoryService,
      );
      vi.spyOn(service, 'getSupabaseAdmin').mockReturnValue({
        auth: { admin: { updateUserById } },
      } as never);

      // Antes de la baja, el mesero opera y ve el pase de su local.
      await expect(
        resolveLocationAccess(tx, a.staffMainId, a.mainId),
      ).resolves.toBeDefined();

      await service.removeStaff(a.brandId, a.ownerId, a.staffMainId);

      // /api/scan autoriza con resolveLocationAccess en cada request.
      await expect(
        resolveLocationAccess(tx, a.staffMainId, a.mainId),
      ).rejects.toThrow(ForbiddenException);

      const passes = await as(tx, a.staffMainId, () =>
        tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Pass"`,
      );
      expect(passes).toEqual([]);

      expect(updateUserById).toHaveBeenCalledWith(a.staffMainId, {
        ban_duration: '876000h',
      });
      const audit = await tx.auditLog.findMany({
        where: { action: 'staff.remove', entityId: a.staffMainId },
      });
      expect(audit).toHaveLength(1);
    });
  });
});
