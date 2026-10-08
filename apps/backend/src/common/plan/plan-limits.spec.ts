import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { PLAN_LIMIT_CODE, assertPlanAllows } from './plan-limits.js';

const dbWith = (
  planId: string,
  used: { locations?: number; teamUsers?: number; customers?: number },
) =>
  ({
    $queryRaw: vi.fn().mockResolvedValue([]),
    brand: { findUnique: vi.fn().mockResolvedValue({ planId }) },
    merchant: { count: vi.fn().mockResolvedValue(used.locations ?? 0) },
    brandMember: { count: vi.fn().mockResolvedValue(used.teamUsers ?? 0) },
    pass: { count: vi.fn().mockResolvedValue(used.customers ?? 0) },
  }) as unknown as Prisma.TransactionClient;

const reject = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (err: unknown) => err as ForbiddenException,
  );

describe('assertPlanAllows', () => {
  it('blocks growth once the plan limit is reached, with a PLAN_LIMIT code', async () => {
    const err = await reject(
      assertPlanAllows(dbWith('TRIAL', { locations: 1 }), 'b-1', 'locations'),
    );

    expect(err).toBeInstanceOf(ForbiddenException);
    expect(err?.getResponse()).toMatchObject({
      code: PLAN_LIMIT_CODE,
      resource: 'locations',
      limit: 1,
      message:
        'Tu plan Prueba gratis permite 1 sucursal activa. Sube de plan para agregar más.',
    });
  });

  it('locks the brand row before counting, so concurrent signups serialize', async () => {
    const db = dbWith('TRIAL', { locations: 0 });
    await assertPlanAllows(db, 'b-1', 'locations');
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(
      (db.$queryRaw as unknown as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
    ).toBeLessThan(
      (db.merchant.count as unknown as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
    );
  });

  it('allows while under the limit', async () => {
    await expect(
      assertPlanAllows(dbWith('STARTER', { teamUsers: 2 }), 'b-1', 'teamUsers'),
    ).resolves.toBeUndefined();
  });

  it('counts only active locations and STAFF (the OWNER does not use a seat)', async () => {
    const db = dbWith('STARTER', { locations: 0 });
    await assertPlanAllows(db, 'b-1', 'locations');
    await assertPlanAllows(db, 'b-1', 'teamUsers');
    expect(db.merchant.count).toHaveBeenCalledWith({
      where: { brandId: 'b-1', isActive: true },
    });
    expect(db.brandMember.count).toHaveBeenCalledWith({
      where: { brandId: 'b-1', role: 'STAFF' },
    });
  });

  it('never limits customers on paid plans', async () => {
    const db = dbWith('PRO', { customers: 100_000 });
    await expect(
      assertPlanAllows(db, 'b-1', 'customers'),
    ).resolves.toBeUndefined();
    expect(db.pass.count).not.toHaveBeenCalled();
  });

  it('can hide the plan from end customers', async () => {
    const err = await reject(
      assertPlanAllows(
        dbWith('TRIAL', { customers: 100 }),
        'b-1',
        'customers',
        { publicMessage: 'No disponible' },
      ),
    );
    expect(err?.message).toBe('No disponible');
  });
});
