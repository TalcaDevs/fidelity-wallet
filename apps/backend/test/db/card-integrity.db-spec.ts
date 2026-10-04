import { afterAll, describe, expect, it } from 'vitest';
import { createBrand, expectDbError, inRollback, prisma } from './db-helpers.js';

afterAll(async () => {
  await prisma.$disconnect();
});

const expiry = new Date('2030-01-01T00:00:00.000Z');

describe('integridad nativa de tarjetas', () => {
  it('usa UNIQUE de PostgreSQL por marca y un CHECK validado para la vigencia', async () => {
    const constraints = await prisma.$queryRaw<
      { name: string; type: string; validated: boolean; definition: string }[]
    >`
      SELECT conname AS name, contype::text AS type, convalidated AS validated,
             pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'public."LoyaltyProgram"'::regclass
        AND conname IN ('LoyaltyProgram_brandId_key', 'LoyaltyProgram_cardValidity_fields')
    `;

    expect(constraints).toEqual(expect.arrayContaining([
      {
        name: 'LoyaltyProgram_brandId_key',
        type: 'u',
        validated: true,
        definition: 'UNIQUE ("brandId")',
      },
      expect.objectContaining({
        name: 'LoyaltyProgram_cardValidity_fields',
        type: 'c',
        validated: true,
      }),
    ]));

    const triggers = await prisma.$queryRaw<{ name: string }[]>`
      SELECT tgname AS name FROM pg_trigger
      WHERE tgrelid = 'public."LoyaltyProgram"'::regclass
        AND tgname = 'loyalty_program_single_per_brand'
    `;
    expect(triggers).toEqual([]);
  });

  it('rechaza una segunda tarjeta por INSERT con la restricción UNIQUE', async () => {
    await inRollback(async (tx) => {
      const brand = await createBrand(tx, 'card-unique-insert');
      await expectDbError(
        tx,
        () => tx.$executeRaw`
          INSERT INTO "LoyaltyProgram" ("brandId", name, type)
          VALUES (${brand.brandId}::uuid, 'Otra tarjeta', 'POINTS')
        `,
        '23505',
      );
      expect(await tx.loyaltyProgram.count({ where: { brandId: brand.brandId } })).toBe(1);
    });
  });

  it('rechaza mover por UPDATE una tarjeta a una marca que ya tiene otra', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'card-unique-a');
      const b = await createBrand(tx, 'card-unique-b');
      await expectDbError(
        tx,
        () => tx.$executeRaw`
          UPDATE "LoyaltyProgram" SET "brandId" = ${a.brandId}::uuid
          WHERE id = ${b.programId}::uuid
        `,
        '23505',
      );
      expect((await tx.loyaltyProgram.findUniqueOrThrow({ where: { id: b.programId } })).brandId)
        .toBe(b.brandId);
    });
  });

  it.each([
    { cardValidity: 'UNLIMITED', cardExpiresAt: null, cardValidityDays: null },
    { cardValidity: 'FIXED_DATE', cardExpiresAt: expiry, cardValidityDays: null },
    { cardValidity: 'AFTER_JOIN', cardExpiresAt: null, cardValidityDays: 1 },
    { cardValidity: 'AFTER_JOIN', cardExpiresAt: null, cardValidityDays: 3650 },
  ] as const)('acepta la vigencia válida $cardValidity / $cardValidityDays', async (data) => {
    await inRollback(async (tx) => {
      const brand = await createBrand(tx, 'card-validity-valid');
      const updated = await tx.loyaltyProgram.update({ where: { id: brand.programId }, data });
      expect(updated).toMatchObject(data);
    });
  });

  it.each([
    { cardValidity: 'UNLIMITED', cardExpiresAt: expiry, cardValidityDays: null },
    { cardValidity: 'UNLIMITED', cardExpiresAt: null, cardValidityDays: 30 },
    { cardValidity: 'FIXED_DATE', cardExpiresAt: null, cardValidityDays: null },
    { cardValidity: 'FIXED_DATE', cardExpiresAt: expiry, cardValidityDays: 30 },
    { cardValidity: 'AFTER_JOIN', cardExpiresAt: null, cardValidityDays: null },
    { cardValidity: 'AFTER_JOIN', cardExpiresAt: expiry, cardValidityDays: 30 },
    { cardValidity: 'AFTER_JOIN', cardExpiresAt: null, cardValidityDays: 0 },
    { cardValidity: 'AFTER_JOIN', cardExpiresAt: null, cardValidityDays: 3651 },
  ] as const)('rechaza la vigencia inválida $cardValidity / $cardExpiresAt / $cardValidityDays', async (data) => {
    await inRollback(async (tx) => {
      const brand = await createBrand(tx, 'card-validity-invalid');
      await expectDbError(
        tx,
        () => tx.$executeRaw`
          UPDATE "LoyaltyProgram"
          SET "cardValidity" = ${data.cardValidity}::"CardValidity",
              "cardExpiresAt" = ${data.cardExpiresAt}::timestamp,
              "cardValidityDays" = ${data.cardValidityDays}::integer
          WHERE id = ${brand.programId}::uuid
        `,
        'LoyaltyProgram_cardValidity_fields',
      );
      expect(await tx.loyaltyProgram.findUniqueOrThrow({ where: { id: brand.programId } }))
        .toMatchObject({ cardValidity: 'UNLIMITED', cardExpiresAt: null, cardValidityDays: null });
    });
  });
});
