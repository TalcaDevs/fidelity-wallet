import 'reflect-metadata';
import {
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { ScanService } from '../../src/scan/scan.service.js';
import type { PassesService } from '../../src/passes/passes.service.js';
import type { ManualLookupLimiter } from '../../src/scan/manual-lookup-limiter.js';
import type { ReceiptStorageService } from '../../src/scan/receipt-storage.service.js';
import type { ScanValidationTokens } from '../../src/scan/validation-token.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import type { VoidScanResponseDto } from '../../src/customers/dto/void-scan.dto.js';
import {
  createBrand,
  prisma,
  type Tx,
} from './db-helpers.js';

afterAll(async () => {
  await prisma.$disconnect();
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function createScanService(
  prismaClient: PrismaService = prisma as unknown as PrismaService,
): {
  service: ScanService;
  passesMock: PassesService;
} {
  const passesMock = {
    getPassData: vi.fn(),
    notifyPassUpdate: vi.fn().mockResolvedValue(undefined),
    enqueuePassUpdate: vi.fn().mockResolvedValue(undefined),
  } as unknown as PassesService;

  const service = new ScanService(
    prismaClient,
    passesMock,
    new ConfigService({
      STAMP_COOLDOWN_MINUTES: '0',
      OWNER_MAX_STAMPS_PER_LOAD: '10',
    }),
    {} as ManualLookupLimiter,
    {
      uploadThen: async (_upload: unknown, run: () => Promise<unknown>) =>
        run(),
    } as unknown as ReceiptStorageService,
    {} as ScanValidationTokens,
  );

  return { service, passesMock };
}

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

describe('Concurrencia y bloqueos reales en anulación de escaneo (PostgreSQL)', () => {
  it('dos llamadas concurrentes a voidScan sobre el mismo scan: la primera gana con lock pesimista y la segunda falla con ConflictException', async () => {
    const fixture = await prisma.$transaction((tx) =>
      createBrand(tx, 'void-double'),
    );

    const scan = await prisma.scan.findFirstOrThrow({
      where: {
        passId: fixture.passId,
        type: 'STAMP_ADDED',
        voidedAt: null,
      },
    });

    const ready = deferred();
    const release = deferred();
    const appVoid1 = `void-first-${fixture.brandId.slice(0, 8)}`;
    const appVoid2 = `void-second-${fixture.brandId.slice(0, 8)}`;

    const scanner1 = createScanService(
      operationPrisma(appVoid1, {
        afterQuery: async (q) => {
          if (q.includes('Pass') && q.includes('FOR UPDATE')) {
            ready.resolve();
            await release.promise;
          }
        },
      }),
    ).service;

    const scanner2 = createScanService(
      operationPrisma(appVoid2),
    ).service;

    let void1Promise: Promise<VoidScanResponseDto> | undefined;
    let void2Promise: Promise<VoidScanResponseDto> | undefined;

    try {
      // 1. Scanner 1 inicia anulación y pausa justo tras adquirir el lock FOR UPDATE en Pass
      void1Promise = scanner1.voidScan(
        fixture.customerId,
        scan.id,
        { brandId: fixture.brandId, reason: 'Anulación concurrente ganadora' },
        fixture.ownerId,
      );

      await ready.promise;

      // 2. Scanner 2 intenta anular mientras Scanner 1 retiene el bloqueo de fila en Pass
      void2Promise = scanner2.voidScan(
        fixture.customerId,
        scan.id,
        { brandId: fixture.brandId, reason: 'Anulación concurrente perdedora' },
        fixture.ownerId,
      );

      // Esperar brevemente para asegurar que la segunda transacción esté bloqueada en Postgres
      await new Promise<void>((r) => setTimeout(r, 100));

      // 3. Liberar Scanner 1 para que complete su transacción y persista voidedAt
      release.resolve();

      const [res1, res2] = await Promise.allSettled([
        void1Promise,
        void2Promise,
      ]);

      // Scanner 1 gana
      expect(res1.status).toBe('fulfilled');
      if (res1.status === 'fulfilled') {
        expect(res1.value.scanId).toBe(scan.id);
        expect(res1.value.voidedAt).toBeDefined();
      }

      // Scanner 2 pierde por conflicto
      expect(res2.status).toBe('rejected');
      if (res2.status === 'rejected') {
        expect(res2.reason).toBeInstanceOf(ConflictException);
        expect(res2.reason.message).toContain('Esta carga ya fue anulada previamente');
      }

      // Validar que exactamente 1 fila en AuditLog quede persistida con action = 'scan.void'
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityId: scan.id,
          action: 'scan.void',
        },
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].actorUserId).toBe(fixture.ownerId);
      expect(auditLogs[0].entity).toBe('Scan');
      expect(auditLogs[0].reason).toBe('Anulación concurrente ganadora');

      // Validar estado del scan en base de datos
      const updatedScan = await prisma.scan.findUniqueOrThrow({
        where: { id: scan.id },
      });
      expect(updatedScan.voidedAt).not.toBeNull();
      expect(updatedScan.voidedByUserId).toBe(fixture.ownerId);
      expect(updatedScan.voidReason).toBe('Anulación concurrente ganadora');

      // Validar que los sellos fueron eliminados
      const remainingStamps = await prisma.stamp.findMany({
        where: { sourceScanId: scan.id },
      });
      expect(remainingStamps).toHaveLength(0);
    } finally {
      release.resolve();
      await Promise.allSettled([
        ...(void1Promise ? [void1Promise] : []),
        ...(void2Promise ? [void2Promise] : []),
      ]);
      await prisma.$transaction(async (tx) => {
        await tx.auditLog.deleteMany({
          where: { actorUserId: fixture.ownerId },
        });
        await tx.brand.delete({ where: { id: fixture.brandId } });
        await tx.customer.delete({ where: { id: fixture.customerId } });
      });
    }
  }, 20_000);

  it('carrera entre canje y anulación: si el canje consume los sellos antes o durante la anulación, esta falla con ConflictException sin borrar sellos', async () => {
    const fixture = await prisma.$transaction((tx) =>
      createBrand(tx, 'void-redeem'),
    );

    const scan = await prisma.scan.findFirstOrThrow({
      where: {
        passId: fixture.passId,
        merchantId: fixture.mainId,
        type: 'STAMP_ADDED',
      },
    });

    const readyRedeem = deferred();
    const releaseRedeem = deferred();
    const redeemApp = `redeem-${fixture.brandId.slice(0, 8)}`;
    const voidApp = `void-${fixture.brandId.slice(0, 8)}`;

    const scannerVoid = createScanService(
      operationPrisma(voidApp),
    ).service;

    let redeemPromise: Promise<void> | undefined;
    let voidPromise: Promise<VoidScanResponseDto> | undefined;

    try {
      // 1. Simular transacción de canje que bloquea Pass (FOR UPDATE) y consume los sellos del escaneo
      redeemPromise = prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT set_config('application_name', ${redeemApp}, true)`;
          await tx.$queryRaw`SELECT id FROM "LoyaltyProgram" WHERE id = ${fixture.programId}::uuid FOR SHARE`;
          await tx.$queryRaw`SELECT id FROM "Pass" WHERE id = ${fixture.passId}::uuid FOR UPDATE`;

          const redeemScan = await tx.scan.create({
            data: {
              passId: fixture.passId,
              merchantId: fixture.mainId,
              brandId: fixture.brandId,
              programId: fixture.programId,
              type: 'REWARD_REDEEMED',
            },
          });

          await tx.stamp.updateMany({
            where: { sourceScanId: scan.id },
            data: {
              consumedAt: new Date(),
              consumedByScanId: redeemScan.id,
            },
          });

          readyRedeem.resolve();
          await releaseRedeem.promise;
        },
        { timeout: 15_000 },
      );

      await readyRedeem.promise;

      // 2. voidScan intenta anular mientras la transacción de canje retiene el lock en Pass
      voidPromise = scannerVoid.voidScan(
        fixture.customerId,
        scan.id,
        { brandId: fixture.brandId, reason: 'Intento de anulación de sellos consumidos' },
        fixture.ownerId,
      );

      await new Promise<void>((r) => setTimeout(r, 100));

      // 3. Liberar el canje para que confirme
      releaseRedeem.resolve();

      const [redeemRes, voidRes] = await Promise.allSettled([
        redeemPromise,
        voidPromise,
      ]);

      expect(redeemRes.status).toBe('fulfilled');
      expect(voidRes.status).toBe('rejected');

      if (voidRes.status === 'rejected') {
        expect(voidRes.reason).toBeInstanceOf(ConflictException);
        expect(voidRes.reason.message).toContain(
          'los sellos o puntos ya fueron utilizados en un canje',
        );
      }

      // Los sellos consumidos permanecen intactos (no fueron borrados por la anulación fallida)
      const consumedStamps = await prisma.stamp.findMany({
        where: { sourceScanId: scan.id },
      });
      expect(consumedStamps.length).toBeGreaterThan(0);
      expect(consumedStamps.every((s) => s.consumedAt !== null)).toBe(true);

      // El escaneo no quedó marcado como anulado
      const scanAfter = await prisma.scan.findUniqueOrThrow({
        where: { id: scan.id },
      });
      expect(scanAfter.voidedAt).toBeNull();
      expect(scanAfter.voidReason).toBeNull();

      // Ningún registro de auditoría de anulación fue creado
      const voidAuditLogs = await prisma.auditLog.findMany({
        where: { entityId: scan.id, action: 'scan.void' },
      });
      expect(voidAuditLogs).toHaveLength(0);
    } finally {
      releaseRedeem.resolve();
      await Promise.allSettled([
        ...(redeemPromise ? [redeemPromise] : []),
        ...(voidPromise ? [voidPromise] : []),
      ]);
      await prisma.$transaction(async (tx) => {
        await tx.auditLog.deleteMany({
          where: { actorUserId: fixture.ownerId },
        });
        await tx.brand.delete({ where: { id: fixture.brandId } });
        await tx.customer.delete({ where: { id: fixture.customerId } });
      });
    }
  }, 20_000);

  it('permite anular exitosamente cuando la marca tiene 0 promociones activas (desacople total de promociones)', async () => {
    const fixture = await prisma.$transaction((tx) =>
      createBrand(tx, 'void-zero-promos'),
    );

    try {
      // Eliminar todas las promociones del programa para dejarlo con 0 promociones
      await prisma.promotion.deleteMany({
        where: { programId: fixture.programId },
      });

      const promoCount = await prisma.promotion.count({
        where: { programId: fixture.programId },
      });
      expect(promoCount).toBe(0);

      const scan = await prisma.scan.findFirstOrThrow({
        where: {
          passId: fixture.passId,
          type: 'STAMP_ADDED',
        },
      });

      const { service: scanner } = createScanService();

      // Anulación debe ejecutarse con éxito sin fallar con 'El comercio no tiene una promoción activa válida'
      const result = await scanner.voidScan(
        fixture.customerId,
        scan.id,
        { brandId: fixture.brandId, reason: 'Anulación con cero promociones activas' },
        fixture.ownerId,
      );

      expect(result.scanId).toBe(scan.id);
      expect(result.voidedAt).toBeDefined();

      const updatedScan = await prisma.scan.findUniqueOrThrow({
        where: { id: scan.id },
      });
      expect(updatedScan.voidedAt).not.toBeNull();
      expect(updatedScan.voidReason).toBe('Anulación con cero promociones activas');

      const auditLog = await prisma.auditLog.findFirst({
        where: { entityId: scan.id, action: 'scan.void' },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.reason).toBe('Anulación con cero promociones activas');
    } finally {
      await prisma.$transaction(async (tx) => {
        await tx.auditLog.deleteMany({
          where: { actorUserId: fixture.ownerId },
        });
        await tx.brand.delete({ where: { id: fixture.brandId } });
        await tx.customer.delete({ where: { id: fixture.customerId } });
      });
    }
  }, 20_000);
});
