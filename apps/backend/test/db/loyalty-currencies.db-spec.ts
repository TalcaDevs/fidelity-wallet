import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_CARD_DESIGN,
  DEFAULT_CARD_DETAILS,
  DEFAULT_REGISTRATION,
} from '@fidelity/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { CardService } from '../../src/cards/card.service.js';
import type { SaveCardDto } from '../../src/cards/card.dto.js';
import type { CardAssetsStorageService } from '../../src/cards/card-assets-storage.service.js';
import { BrandSettingsService } from '../../src/merchants/brand-settings.js';
import { PassesService } from '../../src/passes/passes.service.js';
import { PassUpdateWorkerService } from '../../src/passes/services/pass-update-worker.service.js';
import { CustomersService } from '../../src/customers/customers.service.js';
import { ScanService } from '../../src/scan/scan.service.js';
import { ScanActionType } from '../../src/scan/dto/scan-action.dto.js';
import type { ManualLookupLimiter } from '../../src/scan/manual-lookup-limiter.js';
import type { ReceiptStorageService } from '../../src/scan/receipt-storage.service.js';
import type { ScanValidationTokens } from '../../src/scan/validation-token.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import {
  as,
  createBrand,
  expectDbError,
  inRollback,
  prisma,
  type Tx,
} from './db-helpers.js';

afterAll(async () => {
  await prisma.$disconnect();
});

interface Balance {
  passId: string;
  activeStamps: number;
  activePoints: number;
  nextExpiryAt: Date | null;
  stampsEnabled: boolean;
  pointsEnabled: boolean;
}

const readBalance = (tx: Tx, passId: string) => tx.$queryRaw<Balance[]>`
  SELECT "passId", "activeStamps", "activePoints", "nextExpiryAt", "stampsEnabled", "pointsEnabled"
  FROM "PassStampBalance" WHERE "passId" = ${passId}::uuid
`;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function waitForPause(
  ready: Promise<void>,
  operation: Promise<unknown>,
): Promise<void> {
  await Promise.race([
    ready,
    operation.then(() => {
      throw new Error('La operación terminó antes de tomar el lock esperado');
    }),
  ]);
}

function cardConfigService(): ConfigService {
  return new ConfigService({
    CARD_REWARDS_LIMIT_TRIAL: '3',
    CARD_REWARDS_LIMIT_STARTER: '3',
    CARD_REWARDS_LIMIT_PRO: '5',
    CARD_REWARDS_LIMIT_BUSINESS: '10',
  });
}

function saveCardDto(overrides: Partial<SaveCardDto>): SaveCardDto {
  return structuredClone({
    type: 'STAMPS',
    stampsEnabled: true,
    pointsEnabled: false,
    name: 'Club de sellos',
    rewards: [{ name: 'Café', target: 3, currency: 'STAMPS' }],
    welcomeBalance: 0,
    welcomeStamps: 0,
    welcomePoints: 0,
    dailyStampLimit: true,
    stampValidityDays: null,
    validity: { type: 'UNLIMITED', expiresAt: null, days: null },
    registration: DEFAULT_REGISTRATION,
    design: { ...DEFAULT_CARD_DESIGN },
    details: { ...DEFAULT_CARD_DETAILS },
    ...overrides,
  });
}

/** Identifica exclusivamente las conexiones de esta operación, incluso con suites concurrentes. */
function operationPrisma(
  applicationName: string,
  hooks: {
    afterQuery?: (query: string) => Promise<void>;
  } = {},
): PrismaService {
  return new Proxy(prisma, {
    get(target, property) {
      if (property !== '$transaction') return Reflect.get(target, property);
      return async (
        run: (tx: Tx) => Promise<unknown>,
        options?: { timeout?: number; maxWait?: number },
      ) => {
        return target.$transaction(
          async (tx) => {
            await tx.$executeRaw`SELECT set_config('application_name', ${applicationName}, true)`;
            const tracked = new Proxy(tx, {
              get(client, key) {
                if (key !== '$queryRaw') return Reflect.get(client, key);
                return async (
                  strings: TemplateStringsArray,
                  ...values: unknown[]
                ) => {
                  const result = await client.$queryRaw(strings, ...values);
                  await hooks.afterQuery?.(strings.join('?'));
                  return result;
                };
              },
            });
            return run(tracked);
          },
          { timeout: 15_000, ...options },
        );
      };
    },
  }) as unknown as PrismaService;
}

async function waitForLock(
  applicationName: string,
  table: 'Brand' | 'LoyaltyProgram',
  mode: 'FOR SHARE' | 'FOR UPDATE',
) {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    const waiting = await prisma.$queryRaw<{ waiting: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_stat_activity
        WHERE datname = current_database() AND application_name = ${applicationName}
          AND wait_event_type = 'Lock'
          AND query LIKE ${`%"${table}"%`} AND query LIKE ${`%${mode}%`}
      ) AS waiting
    `;
    if (waiting[0].waiting) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(
    `La operación ${applicationName} no llegó al lock de ${table} ${mode}`,
  );
}

describe('modalidades y saldos por moneda en PostgreSQL', () => {
  it('impide saltar cuotas y locks por escritura directa de OWNER, STAFF, otra marca o anon', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'currencies-mutations-a');
      const b = await createBrand(tx, 'currencies-mutations-b');
      const backend = await tx.$queryRaw<
        { promotionWrite: boolean; programWrite: boolean }[]
      >`
        SELECT has_table_privilege('service_role', 'public."Promotion"', 'INSERT, UPDATE, DELETE') AS "promotionWrite",
               has_table_privilege('service_role', 'public."LoyaltyProgram"', 'INSERT, UPDATE, DELETE') AS "programWrite"
      `;
      expect(backend).toEqual([{ promotionWrite: true, programWrite: true }]);
      for (const userId of [a.ownerId, a.staffMainId, b.ownerId, null]) {
        await as(tx, userId, async () => {
          const privileges = await tx.$queryRaw<
            {
              promotionInsert: boolean;
              promotionUpdate: boolean;
              promotionDelete: boolean;
              programInsert: boolean;
              programUpdate: boolean;
              programDelete: boolean;
              validityUpdate: boolean;
              programNameUpdate: boolean;
              flagsUpdate: boolean;
              brandPlanUpdate: boolean;
              brandPointsUpdate: boolean;
            }[]
          >`
            SELECT
              has_table_privilege(current_user, 'public."Promotion"', 'INSERT') AS "promotionInsert",
              has_table_privilege(current_user, 'public."Promotion"', 'UPDATE') AS "promotionUpdate",
              has_table_privilege(current_user, 'public."Promotion"', 'DELETE') AS "promotionDelete",
              has_table_privilege(current_user, 'public."LoyaltyProgram"', 'INSERT') AS "programInsert",
              has_table_privilege(current_user, 'public."LoyaltyProgram"', 'UPDATE') AS "programUpdate",
              has_table_privilege(current_user, 'public."LoyaltyProgram"', 'DELETE') AS "programDelete",
              has_column_privilege(current_user, 'public."LoyaltyProgram"', 'stampValidityDays', 'UPDATE') AS "validityUpdate",
              has_column_privilege(current_user, 'public."LoyaltyProgram"', 'name', 'UPDATE') AS "programNameUpdate",
              has_column_privilege(current_user, 'public."LoyaltyProgram"', 'pointsEnabled', 'UPDATE') AS "flagsUpdate",
              has_column_privilege(current_user, 'public."Brand"', 'planId', 'UPDATE') AS "brandPlanUpdate",
              has_column_privilege(current_user, 'public."Brand"', 'pointsEnabled', 'UPDATE') AS "brandPointsUpdate"
          `;
          expect(Object.values(privileges[0])).toEqual(Array(11).fill(false));
          await expectDbError(
            tx,
            () => tx.$executeRaw`
            INSERT INTO "Promotion" ("programId", name, "targetStamps", "rewardName")
            VALUES (${a.programId}::uuid, 'Premio extra', 1, 'Premio extra')
          `,
            '42501',
          );
          await expectDbError(
            tx,
            () => tx.$executeRaw`
            UPDATE "Promotion" SET "isActive" = true, currency = 'POINTS' WHERE id = ${a.promotionId}::uuid
          `,
            '42501',
          );
          await expectDbError(
            tx,
            () => tx.$executeRaw`
            DELETE FROM "Promotion" WHERE id = ${a.promotionId}::uuid
          `,
            '42501',
          );
          await expectDbError(
            tx,
            () => tx.$executeRaw`
            UPDATE "LoyaltyProgram" SET name = 'Otra tarjeta', "stampValidityDays" = 60 WHERE id = ${a.programId}::uuid
          `,
            '42501',
          );
          await expectDbError(
            tx,
            () => tx.$executeRaw`
            UPDATE "LoyaltyProgram" SET "pointsEnabled" = true, "welcomePoints" = 100 WHERE id = ${a.programId}::uuid
          `,
            '42501',
          );
          await expectDbError(
            tx,
            () => tx.$executeRaw`
            UPDATE "Brand" SET "planId" = 'BUSINESS', "pointsEnabled" = true WHERE id = ${a.brandId}::uuid
          `,
            '42501',
          );
          if (userId === a.ownerId) {
            // Las lecturas RLS y el grant legítimo para el nombre del local se conservan.
            expect(
              await tx.$queryRaw<
                { id: string }[]
              >`SELECT id FROM "LoyaltyProgram" WHERE id = ${a.programId}::uuid`,
            ).toEqual([{ id: a.programId }]);
            expect(
              await tx.$queryRaw<
                { id: string }[]
              >`SELECT id FROM "Promotion" WHERE id = ${a.promotionId}::uuid`,
            ).toEqual([{ id: a.promotionId }]);
            expect(
              await tx.$executeRaw`UPDATE "Merchant" SET name = 'Nombre del local' WHERE id = ${a.mainId}::uuid`,
            ).toBe(1);
          }
        });
      }
      expect(
        await tx.promotion.count({ where: { programId: a.programId } }),
      ).toBe(1);
      expect(await tx.stamp.count({ where: { passId: a.passId } })).toBe(2);
    });
  });
  it('relee el límite del plan después de esperar un cambio concurrente y rechaza crecer fuera del cupo', async () => {
    const brand = await prisma.$transaction(async (tx) => {
      const fixture = await createBrand(tx, 'currencies-plan-race');
      await tx.brand.update({
        where: { id: fixture.brandId },
        data: { planId: 'BUSINESS' },
      });
      return fixture;
    });
    const saveName = `save-${brand.brandId}`;
    const cards = new CardService(
      operationPrisma(saveName),
      { publishCard: async () => {} } as unknown as PassesService,
      { belongsToBrand: () => true } as unknown as CardAssetsStorageService,
      cardConfigService(),
    );
    const dto: SaveCardDto = saveCardDto({
      type: 'STAMPS',
      stampsEnabled: true,
      pointsEnabled: false,
      name: 'Cuatro premios',
      rewards: [
        { id: brand.promotionId, name: 'Café', target: 3, currency: 'STAMPS' },
        ...Array.from({ length: 3 }, (_, i) => ({
          name: `Premio ${i + 2}`,
          target: i + 4,
          currency: 'STAMPS' as const,
        })),
      ],
    });
    const ready = deferred();
    const release = deferred();
    const downgrade = prisma.$transaction(
      async (tx) => {
        await tx.brand.update({
          where: { id: brand.brandId },
          data: { planId: 'STARTER' },
        });
        ready.resolve();
        await release.promise;
      },
      { timeout: 15_000 },
    );
    let saving: Promise<{ error?: unknown }> | undefined;
    try {
      await ready.promise;
      saving = cards.save(brand.brandId, brand.ownerId, dto).then(
        () => ({}),
        (error: unknown) => ({ error }),
      );
      await waitForLock(saveName, 'Brand', 'FOR SHARE');
      release.resolve();
      await downgrade;
      const result = await saving;
      expect(result.error).toBeInstanceOf(ForbiddenException);
      expect((result.error as ForbiddenException).getResponse()).toMatchObject({
        code: 'PLAN_LIMIT',
        resource: 'rewards',
        limit: 3,
        planLimit: 3,
        usage: 1,
      });
      expect(
        await prisma.brand.findUniqueOrThrow({ where: { id: brand.brandId } }),
      ).toMatchObject({ planId: 'STARTER' });
      expect(
        await prisma.promotion.count({ where: { programId: brand.programId } }),
      ).toBe(1);
      expect(
        await prisma.stamp.count({ where: { passId: brand.passId } }),
      ).toBe(2);
    } finally {
      release.resolve();
      await Promise.allSettled([downgrade, ...(saving ? [saving] : [])]);
      await prisma.$transaction(async (tx) => {
        await tx.auditLog.deleteMany({
          where: {
            actorUserId: brand.ownerId,
            entity: 'LoyaltyProgram',
            entityId: brand.programId,
          },
        });
        await tx.brand.delete({ where: { id: brand.brandId } });
        await tx.customer.delete({ where: { id: brand.customerId } });
      });
    }
  }, 20_000);
  it('conserva cinco premios anteriores en Starter, oculta sin gastar cupo y permite recuperarlos al ampliar el plan', async () => {
    await inRollback(async (tx) => {
      const brand = await createBrand(tx, 'currencies-reward-limits');
      await tx.brand.update({
        where: { id: brand.brandId },
        data: { planId: 'STARTER', pointsEnabled: true },
      });
      await tx.promotion.createMany({
        data: Array.from({ length: 4 }, (_, i) => ({
          programId: brand.programId,
          name: `Premio ${i + 2}`,
          rewardName: `Premio ${i + 2}`,
          targetStamps: i + 4,
          currency: 'STAMPS' as const,
        })),
      });
      await tx.stamp.createMany({
        data: [
          {
            passId: brand.passId,
            merchantId: brand.mainId,
            brandId: brand.brandId,
            programId: brand.programId,
            currency: 'POINTS',
            amount: 50,
            expiresAt: new Date(Date.now() + 86_400_000),
          },
          {
            passId: brand.passId,
            merchantId: brand.mainId,
            brandId: brand.brandId,
            programId: brand.programId,
            currency: 'POINTS',
            amount: 100,
            expiresAt: new Date(Date.now() - 86_400_000),
          },
          {
            passId: brand.passId,
            merchantId: brand.mainId,
            brandId: brand.brandId,
            programId: brand.programId,
            currency: 'POINTS',
            amount: 80,
            consumedAt: new Date(),
          },
        ],
      });
      const originalLedger = await tx.stamp.findMany({
        where: { passId: brand.passId },
        orderBy: { id: 'asc' },
      });
      // El servicio ejecuta consultas y escrituras reales dentro del rollback de la fixture.
      // Este caso acredita límites/persistencia; los casos siguientes usan conexiones concurrentes.
      const scoped = new Proxy(tx, {
        get(target, property) {
          if (property === '$transaction')
            return (run: (client: Tx) => Promise<unknown>) => run(target);
          return Reflect.get(target, property);
        },
      });
      const cards = new CardService(
        scoped as unknown as PrismaService,
        { publishCard: async () => {} } as unknown as PassesService,
        { belongsToBrand: () => true } as unknown as CardAssetsStorageService,
        cardConfigService(),
      );
      const rewards = (
        await tx.promotion.findMany({ where: { programId: brand.programId } })
      ).map((reward) => ({
        id: reward.id,
        name: reward.rewardName,
        target: reward.targetStamps,
        currency: reward.currency,
      }));
      const config: SaveCardDto = saveCardDto({
        type: 'STAMPS',
        stampsEnabled: true,
        pointsEnabled: false,
        name: 'Premios anteriores',
        rewards,
      });
      expect(
        (await cards.save(brand.brandId, brand.ownerId, config)).rewardUsage,
      ).toBe(5);
      await expect(
        cards.save(brand.brandId, brand.ownerId, {
          ...config,
          rewards: [
            ...rewards,
            { name: 'Sexto sello', target: 10, currency: 'STAMPS' },
          ],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      const pointsConfig: SaveCardDto = {
        ...config,
        type: 'POINTS',
        stampsEnabled: false,
        pointsEnabled: true,
        rewards: [
          ...rewards,
          { name: 'Premio de puntos', target: 50, currency: 'POINTS' },
        ],
      };
      const hidden = await cards.save(
        brand.brandId,
        brand.ownerId,
        pointsConfig,
      );
      expect(hidden.rewardUsage).toBe(1);
      expect(
        await tx.promotion.count({
          where: { programId: brand.programId, isActive: true },
        }),
      ).toBe(6);
      expect(await readBalance(tx, brand.passId)).toMatchObject([
        { activeStamps: 0, activePoints: 50 },
      ]);
      expect(
        await tx.stamp.findMany({
          where: { passId: brand.passId },
          orderBy: { id: 'asc' },
        }),
      ).toEqual(originalLedger);

      const dual: SaveCardDto = {
        ...pointsConfig,
        type: 'STAMPS',
        stampsEnabled: true,
        rewards: hidden.rewards,
      };
      await expect(
        cards.save(brand.brandId, brand.ownerId, dual),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(
        await tx.loyaltyProgram.findUniqueOrThrow({
          where: { id: brand.programId },
        }),
      ).toMatchObject({ stampsEnabled: false, pointsEnabled: true });
      await tx.brand.update({
        where: { id: brand.brandId },
        data: { planId: 'BUSINESS' },
      });
      const upgraded = await cards.save(brand.brandId, brand.ownerId, dual);
      expect(upgraded).toMatchObject({ rewardLimit: 10, rewardUsage: 6 });
      expect(await readBalance(tx, brand.passId)).toMatchObject([
        { activeStamps: 2, activePoints: 50 },
      ]);
      expect(
        await tx.stamp.findMany({
          where: { passId: brand.passId },
          orderBy: { id: 'asc' },
        }),
      ).toEqual(originalLedger);
    });
  });
  it.each(['card-first', 'signup-first'] as const)(
    'la bienvenida usa modalidades vigentes al serializar alta y guardado: %s',
    async (order) => {
      const brand = await prisma.$transaction(async (tx) => {
        const fixture = await createBrand(tx, `currencies-signup-${order}`);
        await tx.brand.update({
          where: { id: fixture.brandId },
          data: { pointsEnabled: true },
        });
        await tx.loyaltyProgram.update({
          where: { id: fixture.programId },
          data: {
            pointsEnabled: true,
            welcomeStamps: 2,
            welcomePoints: 30,
          },
        });
        return fixture;
      });
      const passes = {
        // Persistencia real de pases; solo se sustituye la integración externa de Wallet.
        findOrCreatePass: PassesService.prototype.findOrCreatePass.bind({
          prisma,
        }),
        getWalletUrlsForPass: async () => ({
          appleWalletUrl: 'https://wallet.test/apple',
          googleWalletUrl: 'https://wallet.test/google',
        }),
        publishCard: async () => {},
      } as unknown as PassesService;
      const saveName = `save-${brand.brandId}`;
      const signupName = `signup-${brand.brandId}`;
      const customers = new CustomersService(
        operationPrisma(signupName),
        passes,
      );
      const cards = new CardService(
        operationPrisma(saveName),
        passes,
        { belongsToBrand: () => true } as unknown as CardAssetsStorageService,
        cardConfigService(),
      );
      const dto: SaveCardDto = saveCardDto({
        type: 'STAMPS',
        stampsEnabled: true,
        pointsEnabled: false,
        name: 'Club de sellos',
        rewards: [
          {
            id: brand.promotionId,
            name: 'Café',
            target: 3,
            currency: 'STAMPS',
          },
        ],
        welcomeBalance: 2,
        welcomeStamps: 2,
        welcomePoints: 30,
      });
      const ready = deferred();
      const release = deferred();
      const blocker = prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Brand" WHERE id = ${brand.brandId}::uuid FOR UPDATE`;
          ready.resolve();
          await release.promise;
        },
        { timeout: 15_000 },
      );
      let customerId: string | undefined;
      let newPassId: string | undefined;
      const running: Promise<unknown>[] = [];
      const save = () => {
        const operation = cards.save(brand.brandId, brand.ownerId, dto);
        running.push(operation.catch(() => {}));
        return operation;
      };
      const signup = () => {
        const operation = customers
          .createOrFindCustomer({
            merchantId: brand.mainId,
            email: `signup-${brand.brandId}@example.test`,
            acceptedTerms: true,
          })
          .then((result) => {
            customerId = result.customerId;
            newPassId = result.passId;
            return result;
          });
        running.push(operation.catch(() => {}));
        return operation;
      };
      try {
        await ready.promise;
        let saved;
        let registered;
        if (order === 'card-first') {
          saved = save();
          await waitForLock(saveName, 'Brand', 'FOR SHARE');
          registered = signup();
          await waitForLock(signupName, 'Brand', 'FOR UPDATE');
        } else {
          registered = signup();
          await waitForLock(signupName, 'Brand', 'FOR UPDATE');
          saved = save();
          await waitForLock(saveName, 'Brand', 'FOR SHARE');
        }
        release.resolve();
        await Promise.all([blocker, saved, registered]);
        const welcome = await prisma.scan.findMany({
          where: { passId: newPassId, method: 'WELCOME' },
        });
        expect(welcome).toMatchObject([
          {
            stampCount: 2,
            pointsEarned: order === 'card-first' ? 0 : 30,
          },
        ]);
        const ledger = await prisma.stamp.findMany({
          where: { passId: newPassId },
          orderBy: { currency: 'asc' },
        });
        expect(
          ledger.map((row) => ({ currency: row.currency, amount: row.amount })),
        ).toEqual(
          order === 'card-first'
            ? [{ currency: 'STAMPS', amount: 2 }]
            : [
                { currency: 'STAMPS', amount: 2 },
                { currency: 'POINTS', amount: 30 },
              ],
        );
        const visible = await prisma.$queryRaw<Balance[]>`
        SELECT * FROM "PassStampBalance" WHERE "passId" = ${newPassId}::uuid
      `;
        expect(visible).toMatchObject([
          { activeStamps: 2, activePoints: 0, pointsEnabled: false },
        ]);
      } finally {
        release.resolve();
        await Promise.allSettled([blocker, ...running]);
        await prisma.$transaction(async (tx) => {
          await tx.auditLog.deleteMany({
            where: {
              actorUserId: brand.ownerId,
              entity: 'LoyaltyProgram',
              entityId: brand.programId,
            },
          });
          await tx.brand.delete({ where: { id: brand.brandId } });
          await tx.customer.deleteMany({
            where: {
              id: {
                in: [brand.customerId, ...(customerId ? [customerId] : [])],
              },
            },
          });
        });
      }
    },
    20_000,
  );
  it.each(['card-first', 'settings-first'] as const)(
    'serializa configuración y tarjeta con locks reales: %s',
    async (order) => {
      // Dos conexiones necesitan ver la misma fixture: se confirma solo esta marca y se borra
      // en finally. Cada UUID pertenece al test; el resto de las pruebas usa rollback.
      const brand = await prisma.$transaction(async (tx) => {
        const fixture = await createBrand(tx, `currencies-lock-${order}`);
        await tx.brand.update({
          where: { id: fixture.brandId },
          data: { pointsEnabled: true },
        });
        return fixture;
      });
      const saveName = `save-${brand.brandId}`;
      const settingsName = `settings-${brand.brandId}`;
      const cardService = new CardService(
        operationPrisma(saveName),
        { publishCard: async () => {} } as unknown as PassesService,
        { belongsToBrand: () => true } as unknown as CardAssetsStorageService,
        cardConfigService(),
      );
      const settingsService = new BrandSettingsService(
        operationPrisma(settingsName),
      );
      const dto: SaveCardDto = saveCardDto({
        type: 'POINTS',
        stampsEnabled: false,
        pointsEnabled: true,
        name: 'Club de puntos',
        rewards: [{ name: 'Premio de puntos', target: 50, currency: 'POINTS' }],
      });
      const ready = deferred();
      const release = deferred();
      const blocker = prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Brand" WHERE id = ${brand.brandId}::uuid FOR UPDATE`;
          ready.resolve();
          await release.promise;
        },
        { timeout: 15_000 },
      );
      const running: Promise<{ success: boolean; error?: unknown }>[] = [];
      const run = (operation: Promise<unknown>) => {
        const result = operation.then(
          () => ({ success: true }),
          (error: unknown) => ({ success: false, error }),
        );
        running.push(result);
        return result;
      };
      try {
        await ready.promise;
        let save;
        let settings;
        if (order === 'card-first') {
          save = run(cardService.save(brand.brandId, brand.ownerId, dto));
          await waitForLock(saveName, 'Brand', 'FOR SHARE');
          settings = run(
            settingsService.update(brand.brandId, brand.ownerId, {
              pointsEnabled: false,
            }),
          );
          await waitForLock(settingsName, 'Brand', 'FOR UPDATE');
        } else {
          settings = run(
            settingsService.update(brand.brandId, brand.ownerId, {
              pointsEnabled: false,
            }),
          );
          await waitForLock(settingsName, 'Brand', 'FOR UPDATE');
          save = run(cardService.save(brand.brandId, brand.ownerId, dto));
          await waitForLock(saveName, 'Brand', 'FOR SHARE');
        }
        release.resolve();
        await blocker;
        const [saved, updated] = await Promise.all([save, settings]);
        if (order === 'card-first') {
          expect(saved.success).toBe(true);
          expect('error' in updated ? updated.error : undefined).toBeInstanceOf(
            ConflictException,
          );
        } else {
          expect(updated.success).toBe(true);
          expect('error' in saved ? saved.error : undefined).toBeInstanceOf(
            BadRequestException,
          );
        }
        const currentBrand = await prisma.brand.findUniqueOrThrow({
          where: { id: brand.brandId },
        });
        const program = await prisma.loyaltyProgram.findUniqueOrThrow({
          where: { id: brand.programId },
        });
        expect({
          capability: currentBrand.pointsEnabled,
          active: program.pointsEnabled,
        }).toEqual(
          order === 'card-first'
            ? { capability: true, active: true }
            : { capability: false, active: false },
        );
        expect(
          await prisma.stamp.count({ where: { passId: brand.passId } }),
        ).toBe(2);
      } finally {
        release.resolve();
        await Promise.allSettled([blocker, ...running]);
        await prisma.$transaction(async (tx) => {
          await tx.auditLog.deleteMany({
            where: {
              actorUserId: brand.ownerId,
              entity: 'LoyaltyProgram',
              entityId: brand.programId,
            },
          });
          await tx.brand.delete({ where: { id: brand.brandId } });
          await tx.customer.delete({ where: { id: brand.customerId } });
        });
      }
    },
    20_000,
  );
  it('un registro repetido comparte Brand con otras lecturas sin esperar un lock exclusivo', async () => {
    const brand = await prisma.$transaction((tx) =>
      createBrand(tx, 'currencies-existing-signup'),
    );
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id: brand.customerId },
    });
    const ready = deferred();
    const release = deferred();
    const blocker = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Brand" WHERE id = ${brand.brandId}::uuid FOR SHARE`;
        ready.resolve();
        await release.promise;
      },
      { timeout: 15_000 },
    );
    const passes = {
      findOrCreatePass: PassesService.prototype.findOrCreatePass.bind({
        prisma,
      }),
    } as unknown as PassesService;
    const customers = new CustomersService(
      operationPrisma(`signup-${brand.brandId}`),
      passes,
    );
    let signup: Promise<unknown> | undefined;
    try {
      await ready.promise;
      signup = customers.createOrFindCustomer({
        merchantId: brand.mainId,
        phone: customer.phone!,
        acceptedTerms: true,
      });
      const result = await Promise.race([
        signup,
        new Promise<never>((_resolve, reject) => {
          const timeout = setTimeout(
            () =>
              reject(
                new Error('El pase existente pidió lock exclusivo de Brand'),
              ),
            3_000,
          );
          timeout.unref();
          void signup!.then(
            () => clearTimeout(timeout),
            () => clearTimeout(timeout),
          );
        }),
      ]);
      expect(result).toEqual({
        customerId: brand.customerId,
        passId: brand.passId,
        isNew: false,
      });
      expect(
        await prisma.pass.count({ where: { brandId: brand.brandId } }),
      ).toBe(1);
      expect(
        await prisma.stamp.count({ where: { passId: brand.passId } }),
      ).toBe(2);
    } finally {
      release.resolve();
      await Promise.allSettled([blocker, ...(signup ? [signup] : [])]);
      await prisma.$transaction(async (tx) => {
        await tx.brand.delete({ where: { id: brand.brandId } });
        await tx.customer.delete({ where: { id: brand.customerId } });
      });
    }
  }, 20_000);
  it.each(['card-first', 'scan-first'] as const)(
    'serializa edición y carga preparada con configuración anterior usando locks reales: %s',
    async (order) => {
      const brand = await prisma.$transaction(async (tx) => {
        const fixture = await createBrand(tx, `currencies-scan-${order}`);
        await tx.brand.update({
          where: { id: fixture.brandId },
          data: { pointsEnabled: true },
        });
        return fixture;
      });
      const originalLedger = await prisma.stamp.findMany({
        where: { passId: brand.passId },
        orderBy: { id: 'asc' },
      });
      const originalScans = await prisma.scan.findMany({
        where: { passId: brand.passId },
        orderBy: { id: 'asc' },
      });
      const ready = deferred();
      const release = deferred();
      const saveName = `save-${brand.brandId}`;
      const scanName = `scan-${brand.brandId}`;
      const holdProgram =
        (mode: 'FOR SHARE' | 'FOR UPDATE') => async (query: string) => {
          if (query.includes('"LoyaltyProgram"') && query.includes(mode)) {
            ready.resolve();
            await release.promise;
          }
        };
      const passes = {
        publishCard: async () => {},
        notifyPassUpdate: async () => {},
        enqueuePassUpdate: PassesService.prototype.enqueuePassUpdate.bind({
          prisma,
          updateWorker: {
            enqueue: PassUpdateWorkerService.prototype.enqueue.bind({ prisma }),
          },
        }),
      } as unknown as PassesService;
      const cards = new CardService(
        operationPrisma(
          saveName,
          order === 'card-first'
            ? { afterQuery: holdProgram('FOR UPDATE') }
            : {},
        ),
        passes,
        { belongsToBrand: () => true } as unknown as CardAssetsStorageService,
        cardConfigService(),
      );
      const scanner = new ScanService(
        operationPrisma(
          scanName,
          order === 'scan-first'
            ? { afterQuery: holdProgram('FOR SHARE') }
            : {},
        ),
        passes,
        new ConfigService({ STAMP_COOLDOWN_MINUTES: '0' }),
        {} as ManualLookupLimiter,
        {
          uploadThen: async (_upload: unknown, run: () => Promise<unknown>) =>
            run(),
        } as unknown as ReceiptStorageService,
        {} as ScanValidationTokens,
      );
      const dto = saveCardDto({
        type: 'POINTS',
        stampsEnabled: false,
        pointsEnabled: true,
        rewards: [
          {
            id: brand.promotionId,
            name: 'Café',
            target: 3,
            currency: 'STAMPS',
          },
          { name: 'Premio puntos', target: 50, currency: 'POINTS' },
        ],
      });
      const runScan = () =>
        scanner
          .processScan(
            {
              action: ScanActionType.STAMP,
              merchantId: brand.mainId,
              passToken: `token-${brand.passId}`,
              stampCount: 1,
              reason: 'Prueba concurrente',
            },
            brand.ownerId,
          )
          .then(
            (result) => ({ result }),
            (error: unknown) => ({ error }),
          );
      let saving: Promise<unknown> | undefined;
      let scanning: ReturnType<typeof runScan> | undefined;
      try {
        if (order === 'card-first') {
          saving = cards.save(brand.brandId, brand.ownerId, dto);
          await waitForPause(ready.promise, saving);
          // La edición aún no está confirmada: processScan prepara sus opciones con STAMPS.
          scanning = runScan();
          await waitForLock(scanName, 'LoyaltyProgram', 'FOR SHARE');
        } else {
          scanning = runScan();
          await waitForPause(ready.promise, scanning);
          saving = cards.save(brand.brandId, brand.ownerId, dto);
          await waitForLock(saveName, 'LoyaltyProgram', 'FOR UPDATE');
        }
        release.resolve();
        await saving;
        const scanned = await scanning!;
        const ledger = await prisma.stamp.findMany({
          where: { passId: brand.passId },
          orderBy: { id: 'asc' },
        });
        const scans = await prisma.scan.findMany({
          where: { passId: brand.passId },
          orderBy: { id: 'asc' },
        });
        if (order === 'card-first') {
          expect(scanned).toHaveProperty('error');
          expect(
            'error' in scanned ? scanned.error : undefined,
          ).toBeInstanceOf(BadRequestException);
          expect(
            ('error' in scanned ? scanned.error : undefined) as Error,
          ).toHaveProperty(
            'message',
            'La configuración de la tarjeta cambió. Vuelve a validar al cliente',
          );
          expect(scans).toEqual(originalScans);
          expect(ledger).toEqual(originalLedger);
        } else {
          expect(scanned).toMatchObject({
            result: { stampsAdded: 1, activeStamps: 3 },
          });
          expect(scans).toHaveLength(originalScans.length + 1);
          expect(
            ledger.filter((row) =>
              originalLedger.some((original) => original.id === row.id),
            ),
          ).toEqual(originalLedger);
          const added = ledger.filter(
            (row) => !originalLedger.some((original) => original.id === row.id),
          );
          expect(added).toMatchObject([{ currency: 'STAMPS', amount: 1 }]);
        }
        expect(await readBalance(prisma, brand.passId)).toMatchObject([
          {
            activeStamps: 0,
            activePoints: 0,
            stampsEnabled: false,
            pointsEnabled: true,
          },
        ]);
      } finally {
        release.resolve();
        await Promise.allSettled([
          ...(saving ? [saving] : []),
          ...(scanning ? [scanning] : []),
        ]);
        await prisma.$transaction(async (tx) => {
          await tx.auditLog.deleteMany({
            where: { actorUserId: brand.ownerId },
          });
          await tx.brand.delete({ where: { id: brand.brandId } });
          await tx.customer.delete({ where: { id: brand.customerId } });
        });
      }
    },
    20_000,
  );
  it('oculta modalidades y recupera solo saldo vigente sin alterar el ledger', async () => {
    await inRollback(async (tx) => {
      const brand = await createBrand(tx, 'currencies-balance');
      const now = Date.now();
      const stampExpiry = new Date(now + 86_400_000);
      const pointExpiry = new Date(now + 172_800_000);
      const expired = new Date(now - 86_400_000);
      const consumedAt = new Date(now - 3_600_000);
      const base = {
        passId: brand.passId,
        merchantId: brand.secondId,
        brandId: brand.brandId,
        programId: brand.programId,
      };
      await tx.stamp.createMany({
        data: [
          { ...base, currency: 'STAMPS', amount: 5, expiresAt: stampExpiry },
          { ...base, currency: 'POINTS', amount: 30, expiresAt: pointExpiry },
          { ...base, currency: 'STAMPS', amount: 50, expiresAt: expired },
          { ...base, currency: 'POINTS', amount: 500, expiresAt: expired },
          { ...base, currency: 'STAMPS', amount: 25, consumedAt },
          { ...base, currency: 'POINTS', amount: 250, consumedAt },
        ],
      });
      const original = await tx.stamp.findMany({
        where: { passId: brand.passId },
        orderBy: { id: 'asc' },
      });

      for (const data of [
        { stampsEnabled: true, pointsEnabled: true },
        { stampsEnabled: false, pointsEnabled: true },
        { stampsEnabled: true, pointsEnabled: false },
        { stampsEnabled: true, pointsEnabled: true },
      ]) {
        await tx.loyaltyProgram.update({
          where: { id: brand.programId },
          data,
        });
        expect(await readBalance(tx, brand.passId)).toEqual([
          {
            passId: brand.passId,
            ...data,
            activeStamps: data.stampsEnabled ? 7 : 0,
            activePoints: data.pointsEnabled ? 30 : 0,
            nextExpiryAt: data.stampsEnabled ? stampExpiry : pointExpiry,
          },
        ]);
        expect(
          await tx.stamp.findMany({
            where: { passId: brand.passId },
            orderBy: { id: 'asc' },
          }),
        ).toEqual(original);
      }
    });
  });

  it('permite cargas de puntos y duales, pero rechaza cantidades negativas o una carga vacía', async () => {
    await inRollback(async (tx) => {
      const brand = await createBrand(tx, 'currencies-constraints');
      const base = {
        passId: brand.passId,
        merchantId: brand.mainId,
        brandId: brand.brandId,
        programId: brand.programId,
        type: 'STAMP_ADDED' as const,
      };
      await tx.scan.createMany({
        data: [
          { ...base, stampCount: 0, pointsEarned: 7 },
          { ...base, stampCount: 3, pointsEarned: 7 },
          { ...base, stampCount: 3, pointsEarned: 0 },
        ],
      });
      for (const [data, constraint] of [
        [{ stampCount: -1, pointsEarned: 7 }, 'Scan_stampCount_non_negative'],
        [{ stampCount: 3, pointsEarned: -1 }, 'Scan_pointsEarned_non_negative'],
        [{ stampCount: 0, pointsEarned: 0 }, 'Scan_added_currency_positive'],
      ] as const) {
        await expectDbError(
          tx,
          () => tx.scan.create({ data: { ...base, ...data } }),
          constraint,
        );
      }
      // Canjes antiguos no suman moneda y mantenían stampCount=1 por default.
      const reward = await tx.scan.create({
        data: {
          ...base,
          type: 'REWARD_REDEEMED',
          promotionId: brand.promotionId,
        },
      });
      expect(reward).toMatchObject({ stampCount: 1, pointsEarned: 0 });
      await tx.scan.create({
        data: {
          ...base,
          type: 'REWARD_REDEEMED',
          promotionId: brand.promotionId,
          stampCount: 0,
        },
      });
    });
  });

  it('la vista conserva security_invoker y aislamiento para OWNER, STAFF y anon', async () => {
    await inRollback(async (tx) => {
      const a = await createBrand(tx, 'currencies-rls-a');
      const b = await createBrand(tx, 'currencies-rls-b');
      await tx.loyaltyProgram.update({
        where: { id: a.programId },
        data: { pointsEnabled: true },
      });
      await tx.stamp.create({
        data: {
          passId: a.passId,
          merchantId: a.secondId,
          brandId: a.brandId,
          programId: a.programId,
          currency: 'POINTS',
          amount: 15,
        },
      });
      const options = await tx.$queryRaw<{ reloptions: string[] }[]>`
        SELECT reloptions FROM pg_class WHERE oid = 'public."PassStampBalance"'::regclass
      `;
      expect(options[0].reloptions).toContain('security_invoker=true');
      for (const userId of [a.ownerId, a.staffMainId, a.staffSecondId]) {
        await as(tx, userId, async () => {
          expect(await readBalance(tx, a.passId)).toMatchObject([
            {
              passId: a.passId,
              activeStamps: 2,
              activePoints: 15,
            },
          ]);
          expect(await readBalance(tx, b.passId)).toEqual([]);
        });
      }
      await as(tx, b.ownerId, async () => {
        expect(await readBalance(tx, a.passId)).toEqual([]);
      });
      await as(tx, null, () =>
        expectDbError(tx, () => readBalance(tx, a.passId), '42501'),
      );
    });
  });

  it('actualiza fixtures del esquema anterior sin duplicar puntos FIFO ni reclasificar datos inciertos', async () => {
    await inRollback(async (tx) => {
      const stamps = await createBrand(tx, 'currencies-upgrade-stamps');
      const points = await createBrand(tx, 'currencies-upgrade-points');
      await tx.loyaltyProgram.update({
        where: { id: stamps.programId },
        data: { welcomeBalance: 3, pointsEnabled: true },
      });
      await tx.loyaltyProgram.update({
        where: { id: points.programId },
        data: {
          type: 'POINTS',
          stampsEnabled: false,
          pointsEnabled: true,
          welcomeBalance: 11,
        },
      });
      const base = {
        passId: points.passId,
        merchantId: points.mainId,
        brandId: points.brandId,
        programId: points.programId,
      };
      const legacy = await tx.scan.create({
        data: { ...base, type: 'STAMP_ADDED', stampCount: 8 },
      });
      await tx.stamp.createMany({
        data: [
          {
            ...base,
            sourceScanId: legacy.id,
            currency: 'POINTS',
            amount: 8,
            consumedAt: new Date(),
          },
          { ...base, sourceScanId: legacy.id, currency: 'POINTS', amount: 5 },
        ],
      });
      const mixed = await tx.scan.create({
        data: { ...base, type: 'STAMP_ADDED', stampCount: 4 },
      });
      await tx.stamp.createMany({
        data: [
          { ...base, sourceScanId: mixed.id, currency: 'POINTS', amount: 2 },
          { ...base, sourceScanId: mixed.id, currency: 'STAMPS', amount: 4 },
        ],
      });
      const unlinked = await tx.scan.create({
        data: { ...base, type: 'STAMP_ADDED', stampCount: 3 },
      });
      const modern = await tx.scan.create({
        data: { ...base, type: 'STAMP_ADDED', stampCount: 1, pointsEarned: 5 },
      });
      await tx.stamp.create({
        data: {
          ...base,
          sourceScanId: modern.id,
          currency: 'POINTS',
          amount: 5,
        },
      });
      const ledgerBefore = await tx.stamp.findMany({
        where: { passId: points.passId },
        orderBy: { id: 'asc' },
      });
      const promotionsBefore = await tx.promotion.findMany({
        where: { programId: points.programId },
      });

      // Recrear la forma previa dentro de la transacción revertida, nunca resetear la BD.
      await tx.$executeRawUnsafe(
        'ALTER TABLE "LoyaltyProgram" DROP COLUMN "welcomeStamps", DROP COLUMN "welcomePoints"',
      );
      await tx.$executeRawUnsafe(`ALTER TABLE "Scan"
        DROP CONSTRAINT "Scan_stampCount_non_negative",
        DROP CONSTRAINT "Scan_pointsEarned_non_negative",
        DROP CONSTRAINT "Scan_added_currency_positive",
        ADD CONSTRAINT "Scan_stampCount_positive" CHECK ("stampCount" >= 1) NOT VALID`);
      const previousMigration = readFileSync(
        new URL(
          '../../prisma/migrations/20260930120000_brands_locations_programs/migration.sql',
          import.meta.url,
        ),
        'utf8',
      );
      const previousView = previousMigration.match(
        /CREATE VIEW public\."PassStampBalance"[\s\S]*?GROUP BY p\.id;/,
      )?.[0];
      if (!previousView)
        throw new Error('No se encontró la definición de la vista anterior');
      await tx.$executeRawUnsafe('DROP VIEW public."PassStampBalance"');
      await tx.$executeRawUnsafe(previousView);
      await tx.$executeRawUnsafe(
        'GRANT SELECT ON public."PassStampBalance" TO authenticated, service_role',
      );

      const migration = readFileSync(
        new URL(
          '../../prisma/migrations/20261006150000_loyalty_currency_balances/migration.sql',
          import.meta.url,
        ),
        'utf8',
      );
      // Esta migración contiene DDL/DML simple sin cuerpos de funciones ni literales con ";".
      for (const statement of migration
        .replace(/--[^\n]*/g, '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)) {
        await tx.$executeRawUnsafe(statement);
      }

      expect(
        await tx.loyaltyProgram.findUniqueOrThrow({
          where: { id: stamps.programId },
        }),
      ).toMatchObject({
        welcomeBalance: 3,
        welcomeStamps: 3,
        welcomePoints: 0,
      });
      expect(
        await tx.loyaltyProgram.findUniqueOrThrow({
          where: { id: points.programId },
        }),
      ).toMatchObject({
        welcomeBalance: 11,
        welcomeStamps: 0,
        welcomePoints: 11,
      });
      expect(
        await tx.scan.findUniqueOrThrow({ where: { id: legacy.id } }),
      ).toMatchObject({ stampCount: 0, pointsEarned: 8 });
      for (const original of [mixed, unlinked, modern]) {
        expect(
          await tx.scan.findUniqueOrThrow({ where: { id: original.id } }),
        ).toEqual(original);
      }
      expect(
        await tx.stamp.findMany({
          where: { passId: points.passId },
          orderBy: { id: 'asc' },
        }),
      ).toEqual(ledgerBefore);
      expect(
        await tx.promotion.findMany({ where: { programId: points.programId } }),
      ).toEqual(promotionsBefore);
      await as(tx, points.ownerId, async () => {
        expect(await readBalance(tx, points.passId)).toMatchObject([
          {
            activeStamps: 0,
            activePoints: 12,
          },
        ]);
        expect(await readBalance(tx, stamps.passId)).toEqual([]);
      });
    });
  });
});
