import { randomUUID } from 'crypto';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassUpdateStatus, type PassUpdateTask, type Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

const DEFAULT_POLL_INTERVAL_MS = 10 * 1000;
const DEFAULT_STALE_LOCK_MS = 2 * 60 * 1000;
const DEFAULT_BOOTSTRAP_DELAY_MS = 1500;
const COMPLETED_RETENTION_MS = 24 * 60 * 60 * 1000;
const FAILED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export type PassDispatcher = (passId: string) => Promise<void>;

@Injectable()
export class PassUpdateWorkerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(PassUpdateWorkerService.name);
  private readonly workerId = `worker-${randomUUID().slice(0, 8)}`;
  private pollTimer: NodeJS.Timeout | null = null;
  private bootstrapTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private dispatcher: PassDispatcher | null = null;
  private isProcessing = false;

  private readonly pollIntervalMs: number;
  private readonly staleLockMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const rawPoll = this.configService.get<string>('PASS_UPDATE_POLL_INTERVAL_MS');
    const parsedPoll = rawPoll !== undefined ? Number(rawPoll) : DEFAULT_POLL_INTERVAL_MS;
    if (!Number.isInteger(parsedPoll) || parsedPoll < 0) {
      throw new Error(
        `Variable de configuración inválida: PASS_UPDATE_POLL_INTERVAL_MS debe ser un número entero mayor o igual a 0, recibido: ${rawPoll}`,
      );
    }
    this.pollIntervalMs = parsedPoll;

    const rawStale = this.configService.get<string>('PASS_UPDATE_STALE_LOCK_MS');
    const parsedStale = rawStale !== undefined ? Number(rawStale) : DEFAULT_STALE_LOCK_MS;
    if (!Number.isInteger(parsedStale) || parsedStale <= 0) {
      throw new Error(
        `Variable de configuración inválida: PASS_UPDATE_STALE_LOCK_MS debe ser un número entero mayor a 0, recibido: ${rawStale}`,
      );
    }
    this.staleLockMs = parsedStale;
  }

  registerDispatcher(dispatcher: PassDispatcher): void {
    this.dispatcher = dispatcher;
  }

  onApplicationBootstrap(): void {
    if (this.configService.get<string>('NODE_ENV') === 'test') {
      return;
    }

    this.bootstrapTimer = setTimeout(
      () => void this.runRecovery(),
      DEFAULT_BOOTSTRAP_DELAY_MS,
    );
    this.bootstrapTimer.unref();

    if (this.pollIntervalMs > 0) {
      this.pollTimer = setInterval(
        () => void this.runBatch(),
        this.pollIntervalMs,
      );
      this.pollTimer.unref();
    }

    this.cleanupTimer = setInterval(
      () => void this.cleanupOldTasks(),
      60 * 60 * 1000,
    );
    this.cleanupTimer.unref();

    this.logger.log(
      `[PassUpdateWorker] Iniciado (${this.workerId}) con sondeo cada ${this.pollIntervalMs}ms`,
    );
  }

  onApplicationShutdown(): void {
    if (this.bootstrapTimer) clearTimeout(this.bootstrapTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async enqueue(
    passId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PassUpdateTask> {
    const client = tx ?? this.prisma;
    const now = new Date();

    const existingPending = await client.passUpdateTask.findFirst({
      where: {
        passId,
        status: PassUpdateStatus.PENDING,
      },
    });

    if (existingPending) {
      const updated = await client.passUpdateTask.updateMany({
        where: {
          id: existingPending.id,
          status: PassUpdateStatus.PENDING,
        },
        data: {
          nextRetryAt: now,
          attempts: 0,
          updatedAt: now,
        },
      });

      if (updated.count > 0) {
        const refreshed = await client.passUpdateTask.findUnique({
          where: { id: existingPending.id },
        });
        if (refreshed) return refreshed;
      }
    }

    return client.passUpdateTask.create({
      data: {
        passId,
        status: PassUpdateStatus.PENDING,
        nextRetryAt: now,
      },
    });
  }

  async processPass(passId: string, taskId?: string): Promise<void> {
    const task = taskId
      ? await this.prisma.passUpdateTask.findUnique({ where: { id: taskId } })
      : await this.prisma.passUpdateTask.findFirst({
          where: {
            passId,
            status: { in: [PassUpdateStatus.PENDING, PassUpdateStatus.PROCESSING] },
          },
          orderBy: { createdAt: 'desc' },
        });

    if (task) {
      await this.processSingleTask(task);
    }
  }

  async processSingleTask(task: PassUpdateTask): Promise<boolean> {
    if (!this.dispatcher) {
      this.logger.warn('[PassUpdateWorker] No hay dispatcher registrado');
      return false;
    }

    const claimId = `${this.workerId}:${randomUUID()}`;
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - this.staleLockMs);

    const runInTx = typeof this.prisma.$transaction === 'function'
      ? (cb: (tx: Prisma.TransactionClient) => Promise<boolean>) => this.prisma.$transaction(cb)
      : (cb: (tx: Prisma.TransactionClient) => Promise<boolean>) => cb(this.prisma as unknown as Prisma.TransactionClient);

    const lockAcquired = await runInTx(async (tx) => {
      try {
        await (tx as unknown as { $queryRaw: (query: unknown, ...args: unknown[]) => Promise<unknown> }).$queryRaw`SELECT id FROM "Pass" WHERE id = ${task.passId}::uuid FOR UPDATE`;
      } catch {
      }

      const activeForPass = await tx.passUpdateTask.findFirst({
        where: {
          passId: task.passId,
          status: PassUpdateStatus.PROCESSING,
          id: { not: task.id },
          lockedAt: { gt: staleThreshold },
        },
      });

      if (activeForPass) {
        return false;
      }

      const lockResult = await tx.passUpdateTask.updateMany({
        where: {
          id: task.id,
          OR: [
            {
              status: PassUpdateStatus.PENDING,
              nextRetryAt: { lte: now },
            },
            {
              status: PassUpdateStatus.PROCESSING,
              lockedAt: { lte: staleThreshold },
            },
          ],
        },
        data: {
          status: PassUpdateStatus.PROCESSING,
          lockedAt: now,
          lockedBy: claimId,
          updatedAt: now,
        },
      });

      return lockResult.count > 0;
    });

    if (!lockAcquired) {
      return false;
    }

    try {
      await this.dispatcher(task.passId);

      const completed = await this.prisma.passUpdateTask.updateMany({
        where: {
          id: task.id,
          lockedBy: claimId,
          status: PassUpdateStatus.PROCESSING,
        },
        data: {
          status: PassUpdateStatus.COMPLETED,
          lockedAt: null,
          lockedBy: null,
          lastError: null,
        },
      });

      return completed.count > 0;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const currentTask = await this.prisma.passUpdateTask.findUnique({
        where: { id: task.id },
      });
      const nextAttempts = (currentTask?.attempts ?? task.attempts) + 1;
      const maxAttempts = currentTask?.maxAttempts ?? task.maxAttempts;
      const isFailed = nextAttempts >= maxAttempts;

      const backoffMs = Math.min(1000 * Math.pow(2, nextAttempts), 300000);
      const nextRetryAt = new Date(Date.now() + backoffMs);

      this.logger.warn(
        `[PassUpdateWorker] Intento ${nextAttempts}/${maxAttempts} falló para pase ${task.passId}: ${errorMsg}. Reintento en ${Math.round(backoffMs / 1000)}s`,
      );

      await this.prisma.passUpdateTask.updateMany({
        where: {
          id: task.id,
          lockedBy: claimId,
          status: PassUpdateStatus.PROCESSING,
        },
        data: {
          status: isFailed ? PassUpdateStatus.FAILED : PassUpdateStatus.PENDING,
          attempts: nextAttempts,
          nextRetryAt,
          lockedAt: null,
          lockedBy: null,
          lastError: errorMsg,
        },
      });
      return false;
    }
  }

  async processBatch(batchSize = 10): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    try {
      const now = new Date();
      const staleThreshold = new Date(now.getTime() - this.staleLockMs);

      const tasks = await this.prisma.passUpdateTask.findMany({
        where: {
          OR: [
            {
              status: PassUpdateStatus.PENDING,
              nextRetryAt: { lte: now },
              OR: [
                { lockedAt: null },
                { lockedAt: { lte: staleThreshold } },
              ],
            },
            {
              status: PassUpdateStatus.PROCESSING,
              lockedAt: { lte: staleThreshold },
            },
          ],
        },
        orderBy: { nextRetryAt: 'asc' },
        take: batchSize,
      });

      let processed = 0;
      for (const task of tasks) {
        const success = await this.processSingleTask(task);
        if (success) processed++;
      }

      return processed;
    } finally {
      this.isProcessing = false;
    }
  }

  private async runRecovery(): Promise<void> {
    try {
      const processed = await this.processBatch(20);
      if (processed > 0) {
        this.logger.log(
          `[PassUpdateWorker] Recuperadas y despachadas ${processed} actualizaciones pendientes tras inicio de servidor`,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[PassUpdateWorker] Error en recuperación inicial: ${msg}`);
    }
  }

  private async runBatch(): Promise<void> {
    try {
      await this.processBatch(10);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[PassUpdateWorker] Error en sondeo periódico: ${msg}`);
    }
  }

  async cleanupOldTasks(): Promise<{ completedCleaned: number; failedCleaned: number }> {
    try {
      const now = new Date();
      const completedThreshold = new Date(now.getTime() - COMPLETED_RETENTION_MS);
      const failedThreshold = new Date(now.getTime() - FAILED_RETENTION_MS);

      const completed = await this.prisma.passUpdateTask.deleteMany({
        where: {
          status: PassUpdateStatus.COMPLETED,
          updatedAt: { lte: completedThreshold },
        },
      });

      const failed = await this.prisma.passUpdateTask.deleteMany({
        where: {
          status: PassUpdateStatus.FAILED,
          updatedAt: { lte: failedThreshold },
        },
      });

      return {
        completedCleaned: completed.count,
        failedCleaned: failed.count,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[PassUpdateWorker] Error limpiando tareas viejas: ${msg}`);
      return { completedCleaned: 0, failedCleaned: 0 };
    }
  }
}
