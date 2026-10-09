import { randomUUID } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';

export type Tx = Prisma.TransactionClient;

export const prisma = new PrismaClient();

class Rollback extends Error {}

/** Corre fn en una transacción que siempre se revierte: los tests no dejan datos. */
export async function inRollback(fn: (tx: Tx) => Promise<void>): Promise<void> {
  try {
    await prisma.$transaction(
      async (tx) => {
        await fn(tx);
        throw new Rollback();
      },
      { timeout: 20_000 },
    );
  } catch (err) {
    if (!(err instanceof Rollback)) throw err;
  }
}

/** Ejecuta fn con el rol y el JWT de Supabase de userId (null = anon), como lo haría PostgREST. */
export async function as<T>(
  tx: Tx,
  userId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  const role = userId ? 'authenticated' : 'anon';
  const claims = JSON.stringify(userId ? { sub: userId, role } : { role });
  await tx.$executeRaw`SELECT set_config('request.jwt.claims', ${claims}, true)`;
  await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role}`);
  try {
    return await fn();
  } finally {
    await tx.$executeRawUnsafe('RESET ROLE');
  }
}

export interface BrandFixture {
  brandId: string;
  mainId: string;
  secondId: string;
  programId: string;
  promotionId: string;
  ownerId: string;
  staffMainId: string;
  staffSecondId: string;
  customerId: string;
  passId: string;
}

/** Marca con dos locales, programa, promoción, OWNER, un STAFF por local y un pase con historial. */
export async function createBrand(
  tx: Tx,
  label: string,
): Promise<BrandFixture> {
  const f: BrandFixture = {
    brandId: randomUUID(),
    mainId: '',
    secondId: randomUUID(),
    programId: randomUUID(),
    promotionId: randomUUID(),
    ownerId: randomUUID(),
    staffMainId: randomUUID(),
    staffSecondId: randomUUID(),
    customerId: randomUUID(),
    passId: randomUUID(),
  };
  f.mainId = f.brandId;
  const suffix = f.brandId.slice(0, 8);

  await tx.brand.create({ data: { id: f.brandId, name: `Marca ${label}` } });
  await tx.merchant.createMany({
    data: [
      {
        id: f.mainId,
        brandId: f.brandId,
        name: `${label} Centro`,
        slug: `t-${label}-centro-${suffix}`,
      },
      {
        id: f.secondId,
        brandId: f.brandId,
        name: `${label} Norte`,
        slug: `t-${label}-norte-${suffix}`,
      },
    ],
  });
  await tx.loyaltyProgram.create({
    data: { id: f.programId, brandId: f.brandId, name: 'Sellos' },
  });
  await tx.promotion.create({
    data: {
      id: f.promotionId,
      programId: f.programId,
      name: 'Café',
      targetStamps: 3,
      rewardName: 'Café',
    },
  });
  await tx.brandMember.createMany({
    data: [
      { userId: f.ownerId, brandId: f.brandId, role: 'OWNER' },
      {
        userId: f.staffMainId,
        brandId: f.brandId,
        role: 'STAFF',
        merchantId: f.mainId,
      },
      {
        userId: f.staffSecondId,
        brandId: f.brandId,
        role: 'STAFF',
        merchantId: f.secondId,
      },
    ],
  });
  await tx.customer.create({
    data: {
      id: f.customerId,
      rut: `${suffix}-K`,
      phone: `+569${String(Date.now() % 1e8).padStart(8, '9')}`,
    },
  });
  await tx.pass.create({
    data: {
      id: f.passId,
      customerId: f.customerId,
      programId: f.programId,
      brandId: f.brandId,
      merchantId: f.mainId,
      passToken: `token-${f.passId}`,
    },
  });

  for (const merchantId of [f.mainId, f.secondId]) {
    const scan = await tx.scan.create({
      data: {
        passId: f.passId,
        merchantId,
        brandId: f.brandId,
        programId: f.programId,
        type: 'STAMP_ADDED',
      },
    });
    await tx.stamp.create({
      data: {
        passId: f.passId,
        merchantId,
        brandId: f.brandId,
        programId: f.programId,
        sourceScanId: scan.id,
      },
    });
  }

  return f;
}

/**
 * Espera que run() falle con un error de Postgres que contenga `fragment`. El SAVEPOINT deja la
 * transacción usable después del error, para seguir con el test y con el rollback final.
 */
export async function expectDbError(
  tx: Tx,
  run: () => Promise<unknown>,
  fragment: string,
): Promise<void> {
  await tx.$executeRawUnsafe('SAVEPOINT expect_db_error');
  let error: unknown;
  try {
    await run();
  } catch (err) {
    error = err;
  }
  await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT expect_db_error');

  if (!error) throw new Error(`Se esperaba un error de BD (${fragment})`);
  const detail =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? `${error.code} ${error.message} ${JSON.stringify(error.meta ?? {})}`
      : error instanceof Error
        ? error.message
        : JSON.stringify(error);
  if (!detail.includes(fragment)) {
    throw new Error(`Error inesperado: ${detail}`);
  }
}
