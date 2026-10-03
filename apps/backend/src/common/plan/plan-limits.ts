import { ForbiddenException } from '@nestjs/common';
import { getPlan, type PlanUsage } from '@fidelity/shared';
import { MerchantRole, type Prisma } from '@prisma/client';
import type { Db } from '../access/brand-access.js';

/** Lo que el plan limita al crecer. Los programas no se crean desde la app (uno por marca). */
export type LimitedResource = Exclude<keyof PlanUsage, 'programs'>;

export const PLAN_LIMIT_CODE = 'PLAN_LIMIT';

const LABELS: Record<LimitedResource, [singular: string, plural: string]> = {
  locations: ['sucursal activa', 'sucursales activas'],
  teamUsers: ['usuario de equipo', 'usuarios de equipo'],
  customers: ['cliente', 'clientes'],
};

/** Mismo criterio que la pantalla de facturación: el uso contra el que se compara cada límite. */
export function countUsage(
  db: Db,
  brandId: string,
  resource: LimitedResource,
): Promise<number> {
  switch (resource) {
    case 'locations':
      return db.merchant.count({ where: { brandId, isActive: true } });
    case 'teamUsers':
      return db.brandMember.count({
        where: { brandId, role: MerchantRole.STAFF },
      });
    case 'customers':
      return db.pass.count({ where: { brandId } });
  }
}

/**
 * Bloquea crecer por sobre el plan (decisión 2026-10-02): lo existente no se toca, pero no se
 * agrega nada más. Bloquea la fila de la marca hasta el fin de la transacción, así que el alta
 * que se valida debe ir en la misma `tx`: si no, N altas simultáneas cuentan lo mismo y pasan.
 */
export async function assertPlanAllows(
  tx: Prisma.TransactionClient,
  brandId: string,
  resource: LimitedResource,
  options: { publicMessage?: string } = {},
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Brand" WHERE id = ${brandId}::uuid FOR UPDATE`;
  const brand = await tx.brand.findUnique({
    where: { id: brandId },
    select: { planId: true },
  });
  if (!brand) return;
  const plan = getPlan(brand.planId);
  const limit = plan.limits[resource];
  if (limit === null) return;

  const used = await countUsage(tx, brandId, resource);
  if (used < limit) return;

  const [singular, plural] = LABELS[resource];
  throw new ForbiddenException({
    code: PLAN_LIMIT_CODE,
    resource,
    limit,
    message:
      options.publicMessage ??
      `Tu plan ${plan.name} permite ${limit} ${limit === 1 ? singular : plural}. Sube de plan para agregar más.`,
  });
}
