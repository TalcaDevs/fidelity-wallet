import { ForbiddenException } from '@nestjs/common';
import {
  BrandStatus,
  MerchantRole,
  type BrandMember,
  type LoyaltyProgram,
  type Prisma,
  type PrismaClient,
} from '@prisma/client';

export type Db = PrismaClient | Prisma.TransactionClient;

export interface LocationWithBrand {
  id: string;
  brandId: string;
  name: string;
  isActive: boolean;
  brand: { name: string; status: BrandStatus };
}

export interface LocationAccess {
  merchant: LocationWithBrand;
  membership: BrandMember;
}

interface AccessOptions {
  ownerOnly?: boolean;
  /** Por defecto true: un local inactivo o de una marca suspendida responde 403. */
  requireOperational?: boolean;
  forbiddenMessage?: string;
  ownerMessage?: string;
}

const DEFAULT_FORBIDDEN =
  'El usuario no está autorizado como personal o dueño en este comercio';
const DEFAULT_OWNER_ONLY =
  'Solo el dueño del comercio puede realizar esta acción';

export const locationWithBrandSelect = {
  id: true,
  brandId: true,
  name: true,
  isActive: true,
  brand: { select: { name: true, status: true } },
} as const;

/**
 * El OWNER accede a todos los locales de su marca; el STAFF, solo al asignado.
 * Un local inexistente responde el mismo 403 que uno ajeno, para no revelar qué ids existen.
 */
export async function resolveLocationAccess(
  db: Db,
  userId: string,
  merchantId: string,
  options: AccessOptions = {},
): Promise<LocationAccess> {
  const forbidden = options.forbiddenMessage ?? DEFAULT_FORBIDDEN;

  const merchant = await db.merchant.findUnique({
    where: { id: merchantId },
    select: locationWithBrandSelect,
  });
  if (!merchant) {
    throw new ForbiddenException(forbidden);
  }

  const membership = await db.brandMember.findUnique({
    where: { userId_brandId: { userId, brandId: merchant.brandId } },
  });
  if (!membership) {
    throw new ForbiddenException(forbidden);
  }

  if (
    membership.role === MerchantRole.STAFF &&
    membership.merchantId !== merchant.id
  ) {
    throw new ForbiddenException(
      'Tu usuario está asignado a otro local de la marca',
    );
  }

  if (options.ownerOnly && membership.role !== MerchantRole.OWNER) {
    throw new ForbiddenException(options.ownerMessage ?? DEFAULT_OWNER_ONLY);
  }

  if (options.requireOperational ?? true) {
    assertLocationOperational(merchant);
  }

  return { merchant, membership };
}

export function isLocationOperational(
  merchant: Pick<LocationWithBrand, 'isActive' | 'brand'>,
): boolean {
  return merchant.isActive && merchant.brand.status === BrandStatus.ACTIVE;
}

export function assertLocationOperational(
  merchant: Pick<LocationWithBrand, 'isActive' | 'brand'>,
): void {
  if (!isLocationOperational(merchant)) {
    throw new ForbiddenException('Este local no está habilitado para operar');
  }
}

/** La tarjeta de la marca (una por marca), sea de sellos o de puntos. */
export async function findBrandProgram(
  db: Db,
  brandId: string,
): Promise<LoyaltyProgram | null> {
  return db.loyaltyProgram.findFirst({
    where: { brandId },
    orderBy: { createdAt: 'asc' },
  });
}

/** No exige marca activa: una marca suspendida tiene que poder escribir a soporte. */
export async function requireBrandOwner(db: Db, userId: string, brandId: string): Promise<BrandMember> {
  const membership = await db.brandMember.findUnique({
    where: { userId_brandId: { userId, brandId } },
  });
  if (membership?.role !== MerchantRole.OWNER) {
    throw new ForbiddenException(DEFAULT_OWNER_ONLY);
  }
  return membership;
}

/** OWNER de una marca que puede operar: una marca suspendida no ve ni edita nada (§8.12). */
export async function requireActiveBrandOwner(db: Db, userId: string, brandId: string): Promise<BrandMember> {
  const membership = await requireBrandOwner(db, userId, brandId);
  const brand = await db.brand.findUnique({ where: { id: brandId }, select: { status: true } });
  if (brand?.status !== BrandStatus.ACTIVE) {
    throw new ForbiddenException('Tu cuenta está suspendida');
  }
  return membership;
}
