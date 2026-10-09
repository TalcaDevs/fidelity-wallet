import 'reflect-metadata';
import { afterAll, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { CustomersService } from '../../src/customers/customers.service.js';
import { PassesService } from '../../src/passes/passes.service.js';
import { PassDeactivationWorkerService } from '../../src/passes/services/pass-deactivation-worker.service.js';
import type { GoogleWalletService } from '../../src/passes/services/google-wallet.service.js';
import type { ApplePassService } from '../../src/passes/services/apple-pass.service.js';
import type { PassUpdateWorkerService } from '../../src/passes/services/pass-update-worker.service.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { createBrand, inRollback, prisma, type Tx } from './db-helpers.js';

afterAll(async () => {
  await prisma.$disconnect();
});

const mockConfigService = {
  get: vi.fn().mockReturnValue(undefined),
} as unknown as ConfigService;

const mockPassUpdateWorker = {
  registerDispatcher: vi.fn(),
} as unknown as PassUpdateWorkerService;

/** Enruta $transaction dentro del test a la transacción del rollback. */
function onTx(tx: Tx): PrismaService {
  return new Proxy(tx, {
    get: (target, key) =>
      key === '$transaction'
        ? (fn: (t: Tx) => Promise<unknown>) => fn(tx)
        : Reflect.get(target, key),
  }) as unknown as PrismaService;
}

describe('Desactivación durable de pases en PostgreSQL (PR #42)', () => {
  it('garantiza que PassDeactivationTask no tiene foreign key cascade a Pass y sobrevive a su eliminación', async () => {
    // Verificar a nivel de esquema de Postgres que no hay FK con ON DELETE CASCADE hacia Pass
    const fkConstraints = await prisma.$queryRaw<
      { conname: string; confdeltype: string }[]
    >`
      SELECT conname, confdeltype
      FROM pg_constraint
      WHERE conrelid = 'public."PassDeactivationTask"'::regclass
        AND confrelid = 'public."Pass"'::regclass
    `;

    expect(fkConstraints).toEqual([]);
  });

  it('persiste PassDeactivationTask en la transacción de deleteCustomerByMerchant y sobrevive a la eliminación del pase aunque Google falle', async () => {
    await inRollback(async (tx) => {
      const brand = await createBrand(tx, 'deact-single');

      const mockGoogleWallet = {
        deactivateLoyaltyObject: vi
          .fn()
          .mockRejectedValue(new Error('Google Wallet 500 Service Unavailable')),
      } as unknown as GoogleWalletService;

      const worker = new PassDeactivationWorkerService(
        onTx(tx),
        mockConfigService,
        mockGoogleWallet,
      );

      const passesService = new PassesService(
        onTx(tx),
        {} as ApplePassService,
        mockGoogleWallet,
        mockPassUpdateWorker,
        worker,
      );

      const customersService = new CustomersService(onTx(tx), passesService);

      // Ejecutar baja del cliente por el comercio
      await customersService.deleteCustomerByMerchant(
        brand.mainId,
        brand.customerId,
        brand.ownerId,
      );

      // Esperar a que el intento inmediato asíncrono complete su ciclo de fallo
      await worker.processPass(brand.passId);

      // 1. El pase fue eliminado físicamente de la base de datos
      const passInDb = await tx.pass.findUnique({
        where: { id: brand.passId },
      });
      expect(passInDb).toBeNull();

      // 2. La tarea durable de desactivación sobrevivió en PostgreSQL
      const task = await tx.passDeactivationTask.findFirst({
        where: { passId: brand.passId },
      });
      expect(task).toBeDefined();
      expect(task?.passId).toBe(brand.passId);
      expect(task?.status).toBe('PENDING');
      expect(task?.attempts).toBe(1);
      expect(task?.lastError).toContain('Google Wallet 500 Service Unavailable');
      expect(task?.nextRetryAt.getTime()).toBeGreaterThan(Date.now());

      // 3. Recuperación post-commit: Google Wallet vuelve a estar operativo
      vi.mocked(mockGoogleWallet.deactivateLoyaltyObject).mockResolvedValueOnce({
        success: true,
      });

      // Simular que el worker reintenta procesar el pase cuando llega la fecha de retry
      await tx.passDeactivationTask.updateMany({
        where: { passId: brand.passId },
        data: { nextRetryAt: new Date(Date.now() - 1000) },
      });

      const recovered = await worker.processPass(brand.passId);
      expect(recovered).toBe(true);

      const recoveredTask = await tx.passDeactivationTask.findFirst({
        where: { passId: brand.passId },
      });
      expect(recoveredTask?.status).toBe('COMPLETED');
      expect(recoveredTask?.lastError).toBeNull();
    });
  });

  it('persiste tareas para todos los pases en deleteCustomerGlobal y se completan con éxito si Google retorna notFound (404)', async () => {
    await inRollback(async (tx) => {
      const brand1 = await createBrand(tx, 'deact-global-1');
      const brand2 = await createBrand(tx, 'deact-global-2');

      // Crear un segundo pase para brand1.customerId en brand2
      const secondPassId = '66666666-7777-8888-9999-000000000000';

      await tx.pass.create({
        data: {
          id: secondPassId,
          customerId: brand1.customerId,
          programId: brand2.programId,
          brandId: brand2.brandId,
          merchantId: brand2.mainId,
          passToken: `token-${secondPassId}`,
        },
      });

      // Simular que el primer pase da 404 (no guardado en Google Wallet) y el segundo 200 OK
      const mockGoogleWallet = {
        deactivateLoyaltyObject: vi
          .fn()
          .mockResolvedValueOnce({ success: true, notFound: true })
          .mockResolvedValueOnce({ success: true }),
      } as unknown as GoogleWalletService;

      const worker = new PassDeactivationWorkerService(
        onTx(tx),
        mockConfigService,
        mockGoogleWallet,
      );

      const passesService = new PassesService(
        onTx(tx),
        {} as ApplePassService,
        mockGoogleWallet,
        mockPassUpdateWorker,
        worker,
      );

      const customersService = new CustomersService(onTx(tx), passesService);

      // Eliminar cliente globalmente
      await customersService.deleteCustomerGlobal(brand1.customerId);

      // Esperar la resolución de los disparos asíncronos en vuelo
      await Promise.all([
        worker.processPass(brand1.passId),
        worker.processPass(secondPassId),
      ]);

      // 1. Cliente y ambos pases fueron eliminados de la BD
      expect(
        await tx.customer.findUnique({ where: { id: brand1.customerId } }),
      ).toBeNull();
      expect(
        await tx.pass.findUnique({ where: { id: brand1.passId } }),
      ).toBeNull();
      expect(
        await tx.pass.findUnique({ where: { id: secondPassId } }),
      ).toBeNull();

      // 2. Ambas tareas fueron registradas y procesadas a COMPLETED
      const task1 = await tx.passDeactivationTask.findFirst({
        where: { passId: brand1.passId },
      });
      const task2 = await tx.passDeactivationTask.findFirst({
        where: { passId: secondPassId },
      });

      expect(task1?.status).toBe('COMPLETED');
      expect(task2?.status).toBe('COMPLETED');
    });
  });

  it('procesa lotes pendientes mediante processBatch de forma idempotente', async () => {
    await inRollback(async (tx) => {
      const brand = await createBrand(tx, 'deact-batch');

      // Crear tarea PENDING lista para ejecutar
      await tx.passDeactivationTask.create({
        data: {
          passId: brand.passId,
          status: 'PENDING',
          attempts: 0,
          nextRetryAt: new Date(Date.now() - 10000),
        },
      });

      const mockGoogleWallet = {
        deactivateLoyaltyObject: vi.fn().mockResolvedValue({ success: true }),
      } as unknown as GoogleWalletService;

      const worker = new PassDeactivationWorkerService(
        onTx(tx),
        mockConfigService,
        mockGoogleWallet,
      );

      const processedCount = await worker.processBatch(10);
      expect(processedCount).toBe(1);

      const completedTask = await tx.passDeactivationTask.findFirst({
        where: { passId: brand.passId },
      });
      expect(completedTask?.status).toBe('COMPLETED');
      expect(mockGoogleWallet.deactivateLoyaltyObject).toHaveBeenCalledTimes(1);

      // Llamar de nuevo no debe volver a llamar a Google Wallet (idempotencia)
      const secondRun = await worker.processBatch(10);
      expect(secondRun).toBe(0);
      expect(mockGoogleWallet.deactivateLoyaltyObject).toHaveBeenCalledTimes(1);
    });
  });
});
