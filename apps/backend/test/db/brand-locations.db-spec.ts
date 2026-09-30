import { randomUUID } from 'crypto';
import { afterAll, describe, expect, it } from 'vitest';
import {
  as,
  createBrand,
  expectDbError,
  inRollback,
  prisma,
  type Tx,
} from './db-helpers.js';

const ids = (rows: { id: string }[]) => rows.map((r) => r.id).sort();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('RLS por marca y local', () => {
  it('OWNER ve todos los locales, pases, escaneos y clientes de su marca', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'a');
      await createBrand(tx, 'b');

      await as(tx, a.ownerId, async () => {
        const merchants = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "Merchant"`;
        expect(ids(merchants)).toEqual([a.mainId, a.secondId].sort());

        const passes = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "Pass"`;
        expect(ids(passes)).toEqual([a.passId]);

        const scans = await tx.$queryRaw<
          { n: number }[]
        >`SELECT count(*)::int AS n FROM "Scan"`;
        expect(scans[0].n).toBe(2);

        const customers = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "Customer"`;
        expect(ids(customers)).toEqual([a.customerId]);

        const balance = await tx.$queryRaw<{ activeStamps: number }[]>`
          SELECT "activeStamps" FROM "PassStampBalance" WHERE "brandId" = ${a.brandId}::uuid`;
        expect(balance[0].activeStamps).toBe(2);
      });
    });
  });

  it('STAFF ve solo su local y su historial, el saldo de la marca, y ningún dato personal', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'a');

      await as(tx, a.staffSecondId, async () => {
        const merchants = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "Merchant"`;
        expect(ids(merchants)).toEqual([a.secondId]);

        const passes = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "Pass"`;
        expect(ids(passes)).toEqual([a.passId]);

        const scans = await tx.$queryRaw<
          { merchantId: string }[]
        >`SELECT "merchantId" FROM "Scan"`;
        expect(scans.map((s) => s.merchantId)).toEqual([a.secondId]);

        const customers = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "Customer"`;
        expect(customers).toEqual([]);

        const members = await tx.$queryRaw<
          { userId: string }[]
        >`SELECT "userId" FROM "BrandMember"`;
        expect(members.map((m) => m.userId)).toEqual([a.staffSecondId]);
      });
    });
  });

  it('un miembro de otra marca no ve nada', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'a');
      const b = await createBrand(tx, 'b');

      await as(tx, b.ownerId, async () => {
        const rows = await tx.$queryRaw<{ n: number }[]>`
          SELECT (SELECT count(*) FROM "Merchant" WHERE "brandId" = ${a.brandId}::uuid)
               + (SELECT count(*) FROM "Pass" WHERE "brandId" = ${a.brandId}::uuid)
               + (SELECT count(*) FROM "Promotion" WHERE "programId" = ${a.programId}::uuid)
               + (SELECT count(*) FROM "Brand" WHERE id = ${a.brandId}::uuid) AS n`;
        expect(Number(rows[0].n)).toBe(0);
      });
    });
  });

  it('el panel no puede leer passToken ni tablas internas', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'a');
      await as(tx, a.ownerId, () =>
        expectDbError(
          tx,
          () => tx.$queryRaw`SELECT "passToken" FROM "Pass"`,
          'permission denied',
        ),
      );
    });
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'a');
      await as(tx, a.ownerId, () =>
        expectDbError(
          tx,
          () => tx.$queryRaw`SELECT * FROM "PlatformAdmin"`,
          'permission denied',
        ),
      );
    });
    await inRollback(async (tx) => {
      await as(tx, null, () =>
        expectDbError(
          tx,
          () => tx.$queryRaw`SELECT * FROM "Brand"`,
          'permission denied',
        ),
      );
    });
  });

  it('el OWNER edita promociones y vigencia de su marca; el STAFF no', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'a');

      await as(tx, a.staffMainId, async () => {
        const updated = await tx.$executeRaw`
          UPDATE "Promotion" SET name = 'hack' WHERE id = ${a.promotionId}::uuid`;
        expect(updated).toBe(0);
      });

      await as(tx, a.ownerId, async () => {
        expect(
          await tx.$executeRaw`UPDATE "Promotion" SET name = 'Café doble' WHERE id = ${a.promotionId}::uuid`,
        ).toBe(1);
        expect(
          await tx.$executeRaw`UPDATE "LoyaltyProgram" SET "stampValidityDays" = 60 WHERE id = ${a.programId}::uuid`,
        ).toBe(1);
      });
    });
  });

  it('un OWNER no puede crear promociones en el programa de otra marca', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'a');
      const b = await createBrand(tx, 'b');

      await as(tx, b.ownerId, () =>
        expectDbError(
          tx,
          () => tx.$executeRaw`
            INSERT INTO "Promotion" ("programId", name, "targetStamps", "rewardName")
            VALUES (${a.programId}::uuid, 'robo', 1, 'robo')`,
          'row-level security',
        ),
      );
    });
  });
});

describe('triggers de consistencia', () => {
  it('fija brandId y programId de Stamp y Scan desde el pase, ignorando lo enviado', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'a');
      const b = await createBrand(tx, 'b');

      const scan = await tx.scan.create({
        data: {
          passId: a.passId,
          merchantId: a.secondId,
          brandId: b.brandId,
          programId: b.programId,
          type: 'STAMP_ADDED',
        },
      });
      expect(scan.brandId).toBe(a.brandId);
      expect(scan.programId).toBe(a.programId);
    });
  });

  it('rechaza un sello registrado en un local de otra marca', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'a');
      const b = await createBrand(tx, 'b');

      await expectDbError(
        tx,
        () =>
          tx.stamp.create({
            data: {
              passId: a.passId,
              merchantId: b.mainId,
              brandId: a.brandId,
              programId: a.programId,
            },
          }),
        'no pertenece a la marca',
      );
    });
  });

  it('rechaza un pase cuyo local no es de la marca del programa', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'a');
      const b = await createBrand(tx, 'b');
      const customer = await tx.customer.create({ data: {} });

      await expectDbError(
        tx,
        () =>
          tx.pass.create({
            data: {
              customerId: customer.id,
              programId: a.programId,
              brandId: a.brandId,
              merchantId: b.mainId,
              passToken: `t-${randomUUID()}`,
            },
          }),
        'no pertenece a la marca',
      );
    });
  });

  it('permite un solo programa de sellos por marca', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'a');
      await expectDbError(
        tx,
        () =>
          tx.loyaltyProgram.create({
            data: { brandId: a.brandId, name: 'Otro' },
          }),
        'P2002',
      );
    });
  });

  it('exige local al STAFF y lo prohíbe al OWNER', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'a');
      await expectDbError(
        tx,
        () =>
          tx.brandMember.create({
            data: { userId: randomUUID(), brandId: a.brandId, role: 'STAFF' },
          }),
        'BrandMember_role_location_check',
      );
    });
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'a');
      await expectDbError(
        tx,
        () =>
          tx.brandMember.create({
            data: {
              userId: randomUUID(),
              brandId: a.brandId,
              role: 'OWNER',
              merchantId: a.mainId,
            },
          }),
        'BrandMember_role_location_check',
      );
    });
  });

  it('rechaza asignar un STAFF a un local de otra marca', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'a');
      const b = await createBrand(tx, 'b');
      await expectDbError(
        tx,
        () =>
          tx.brandMember.create({
            data: {
              userId: randomUUID(),
              brandId: a.brandId,
              role: 'STAFF',
              merchantId: b.mainId,
            },
          }),
        'no pertenece a la marca',
      );
    });
  });
});

describe('handle_new_user', () => {
  const signUp = (tx: Tx, id: string, metadata: object) =>
    tx.$executeRaw`
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES (${id}::uuid, ${`${id}@test.local`}, ${JSON.stringify(metadata)}::jsonb)`;

  it('crea marca, local, programa de sellos y membresía OWNER con el id del usuario', async () => {
    await inRollback(async (tx) => {
      const id = randomUUID();
      await signUp(tx, id, {});

      const brand = await tx.brand.findUnique({ where: { id } });
      const merchant = await tx.merchant.findUnique({ where: { id } });
      const programs = await tx.loyaltyProgram.findMany({
        where: { brandId: id },
      });
      const member = await tx.brandMember.findUnique({
        where: { userId_brandId: { userId: id, brandId: id } },
      });

      expect(brand).not.toBeNull();
      expect(merchant?.brandId).toBe(id);
      expect(merchant?.slug).toBe(`local-${id.replace(/-/g, '').slice(0, 8)}`);
      expect(programs.map((p) => p.type)).toEqual(['STAMPS']);
      expect(member).toMatchObject({ role: 'OWNER', merchantId: null });
    });
  });

  it('no crea nada para una invitación de personal ni da permisos por metadata', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'a');
      const id = randomUUID();
      await signUp(tx, id, { merchant_id: a.mainId, role: 'OWNER' });

      expect(await tx.brand.findUnique({ where: { id } })).toBeNull();
      expect(await tx.brandMember.count({ where: { userId: id } })).toBe(0);
    });
  });

  it('no crea marca para un admin interno, y la metadata no lo hace PlatformAdmin', async () => {
    await inRollback(async (tx) => {
      const id = randomUUID();
      await signUp(tx, id, { platform_admin: true });

      expect(await tx.brand.findUnique({ where: { id } })).toBeNull();
      expect(
        await tx.platformAdmin.findUnique({ where: { userId: id } }),
      ).toBeNull();
    });
  });
});
