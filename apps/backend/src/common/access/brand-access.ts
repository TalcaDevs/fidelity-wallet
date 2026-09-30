import { ForbiddenException } from '@nestjs/common';
import {
  BrandStatus,
  MerchantRole,
  ProgramType,
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
  forbiddenMessage?: string;
  ownerMessage?: string;
}

const DEFAULT_FORBIDDEN = 'El usuario no está autorizado como personal o dueño en este comercio';
const DEFAULT_OWNER_ONLY = 'Solo el dueño del comercio puede realizar esta acción';

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

  if (membership.role === MerchantRole.STAFF && membership.merchantId !== merchant.id) {
    throw new ForbiddenException('Tu usuario está asignado a otro local de la marca');
  }

  if (options.ownerOnly && membership.role !== MerchantRole.OWNER) {
    throw new ForbiddenException(options.ownerMessage ?? DEFAULT_OWNER_ONLY);
  }

  return { merchant, membership };
}

export function isLocationOperational(merchant: Pick<LocationWithBrand, 'isActive' | 'brand'>): boolean {
  return merchant.isActive && merchant.brand.status === BrandStatus.ACTIVE;
}

export function assertLocationOperational(merchant: Pick<LocationWithBrand, 'isActive' | 'brand'>): void {
  if (!isLocationOperational(merchant)) {
    throw new ForbiddenException('Este local no está habilitado para operar');
  }
}

export async function findStampsProgram(db: Db, brandId: string): Promise<LoyaltyProgram | null> {
  return db.loyaltyProgram.findFirst({
    where: { brandId, type: ProgramType.STAMPS },
    orderBy: { createdAt: 'asc' },
  });
}
