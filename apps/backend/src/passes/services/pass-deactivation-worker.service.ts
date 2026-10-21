import { randomUUID } from 'crypto';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PassUpdateStatus,
  type PassDeactivationTask,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { GoogleWalletService } from './google-wallet.service.js';

const DEFAULT_POLL_INTERVAL_MS = 10 * 1000;
const DEFAULT_STALE_LOCK_MS = 2 * 60 * 1000;
const DEFAULT_BOOTSTRAP_DELAY_MS = 1500;
const COMPLETED_RETENTION_MS = 24 * 60 * 60 * 1000;
const FAILED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class PassDeactivationWorkerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(PassDeactivationWorkerService.name);
  private readonly workerId = `deact-worker-${randomUUID().slice(0, 8)}`;
  private pollTimer: NodeJS.Timeout | null = null;
  private bootstrapTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  private readonly pollIntervalMs: number;
  private readonly staleLockMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly googleWalletService: GoogleWalletService,
  ) {
    const rawPoll = this.configService.get<string>('PASS_UPDATE_POLL_INTERVAL_MS');
    const parsedPoll = rawPoll !== undefined ? Number(rawPoll) : DEFAULT_POLL_INTERVAL_MS;
    this.pollIntervalMs = Number.isInteger(parsedPoll) && parsedPoll >= 0 ? parsedPoll : DEFAULT_POLL_INTERVAL_MS;

    const rawStale = this.configService.get<string>('PASS_UPDATE_STALE_LOCK_MS');
    const parsedStale = rawStale !== undefined ? Number(rawStale) : DEFAULT_STALE_LOCK_MS;
    this.staleLockMs = Number.isInteger(parsedStale) && parsedStale > 0 ? parsedStale : DEFAULT_STALE_LOCK_MS;
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
      `[PassDeactivationWorker] Iniciado (${this.workerId}) con sondeo cada ${this.pollIntervalMs}ms`,
    );
  }

  onApplicationShutdown(): void {
    if (this.bootstrapTimer) clearTimeout(this.bootstrapTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  /**
   * Encola la desactivación durable de un pase dentro de la misma transacción de BD
   * que elimina el pase o cliente.
   */
  async enqueue(
    passId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PassDeactivationTask> {
    const client = tx ?? this.prisma;
    const now = new Date();

    const existingPending = await client.passDeactivationTask.findFirst({
      where: {
        passId,
        status: PassUpdateStatus.PENDING,
      },
    });

    if (existingPending) {
      const updated = await client.passDeactivationTask.updateMany({
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
        const refreshed = await client.passDeactivationTask.findUnique({
          where: { id: existingPending.id },
        });
        if (refreshed) return refreshed;
      }
    }

    return client.passDeactivationTask.create({
      data: {
        passId,
        status: PassUpdateStatus.PENDING,
        nextRetryAt: now,
      },
    });
  }

  /**
   * Procesa la desactivación pendiente para un pase específico.
   * Usado para despacho inmediato post-commit o por el worker de sondeo.
   */
  async processPass(passId: string, taskId?: string): Promise<boolean> {
    const task = taskId
      ? await this.prisma.passDeactivationTask.findUnique({ where: { id: taskId } })
      : await this.prisma.passDeactivationTask.findFirst({
          where: {
            passId,
            status: { in: [PassUpdateStatus.PENDING, PassUpdateStatus.PROCESSING] },
          },
          orderBy: { createdAt: 'desc' },
        });

    if (!task) {
      const created = await this.enqueue(passId);
      return this.processSingleTask(created);
    }

    return this.processSingleTask(task);
  }

  async processSingleTask(task: PassDeactivationTask): Promise<boolean> {
    const claimId = `${this.workerId}:${randomUUID()}`;
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - this.staleLockMs);

    const runInTx = typeof this.prisma.$transaction === 'function'
      ? (cb: (tx: Prisma.TransactionClient) => Promise<boolean>) => this.prisma.$transaction(cb)
      : (cb: (tx: Prisma.TransactionClient) => Promise<boolean>) => cb(this.prisma as unknown as Prisma.TransactionClient);

    const lockAcquired = await runInTx(async (tx) => {
      const activeForPass = await tx.passDeactivationTask.findFirst({
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

      const lockResult = await tx.passDeactivationTask.updateMany({
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

    let heartbeat: NodeJS.Timeout | null = null;
    const heartbeatInterval = Math.max(1000, Math.min(Math.floor(this.staleLockMs / 3), 10000));
    heartbeat = setInterval(async () => {
      try {
        await this.prisma.passDeactivationTask.updateMany({
          where: {
            id: task.id,
            lockedBy: claimId,
            status: PassUpdateStatus.PROCESSING,
          },
          data: {
            lockedAt: new Date(),
          },
        });
      } catch {
      }
    }, heartbeatInterval);
    if (typeof heartbeat.unref === 'function') {
      heartbeat.unref();
    }

    try {
      const result = await this.googleWalletService.deactivateLoyaltyObject(task.passId);

      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }

      if (result.success || result.notFound) {
        await this.prisma.passDeactivationTask.updateMany({
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
            updatedAt: new Date(),
          },
        });
        return true;
      }

      const errorMsg = result.error ?? 'Unknown Google Wallet error';
      await this.handleTaskFailure(task, claimId, errorMsg);
      return false;
    } catch (err: unknown) {
      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.handleTaskFailure(task, claimId, errorMsg);
      return false;
    } finally {
      if (heartbeat) {
        clearInterval(heartbeat);
      }
    }
  }

  private async handleTaskFailure(
    task: PassDeactivationTask,
    claimId: string,
    errorMsg: string,
  ): Promise<void> {
    const currentTask = await this.prisma.passDeactivationTask.findUnique({
      where: { id: task.id },
    });
    const nextAttempts = (currentTask?.attempts ?? task.attempts) + 1;
    const maxAttempts = currentTask?.maxAttempts ?? task.maxAttempts;
    const isFailed = nextAttempts >= maxAttempts;

    const backoffMs = Math.min(1000 * Math.pow(2, nextAttempts), 300000);
    const nextRetryAt = new Date(Date.now() + backoffMs);

    this.logger.warn(
      `[PassDeactivationWorker] Intento ${nextAttempts}/${maxAttempts} falló para pase ${task.passId}: ${errorMsg}. Reintento en ${Math.round(backoffMs / 1000)}s`,
    );

    await this.prisma.passDeactivationTask.updateMany({
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
  }

  async processBatch(batchSize = 10): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    try {
      const now = new Date();
      const staleThreshold = new Date(now.getTime() - this.staleLockMs);

      const tasks = await this.prisma.passDeactivationTask.findMany({
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
        try {
          const success = await this.processSingleTask(task);
          if (success) processed++;
        } catch (taskErr: unknown) {
          const msg = taskErr instanceof Error ? taskErr.message : String(taskErr);
          this.logger.error(
            `[PassDeactivationWorker] Error no fatal procesando tarea ${task.id} (${task.passId}): ${msg}`,
          );
        }
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
          `[PassDeactivationWorker] Recuperadas y procesadas ${processed} desactivaciones pendientes tras inicio de servidor`,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[PassDeactivationWorker] Error en recuperación inicial: ${msg}`);
    }
  }

  private async runBatch(): Promise<void> {
    try {
      await this.processBatch(10);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[PassDeactivationWorker] Error en sondeo periódico: ${msg}`);
    }
  }

  async cleanupOldTasks(): Promise<{ completedCleaned: number; failedCleaned: number }> {
    try {
      const now = new Date();
      const completedThreshold = new Date(now.getTime() - COMPLETED_RETENTION_MS);
      const failedThreshold = new Date(now.getTime() - FAILED_RETENTION_MS);

      const completed = await this.prisma.passDeactivationTask.deleteMany({
        where: {
          status: PassUpdateStatus.COMPLETED,
          updatedAt: { lte: completedThreshold },
        },
      });

      const failed = await this.prisma.passDeactivationTask.deleteMany({
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
      this.logger.error(`[PassDeactivationWorker] Error limpiando tareas viejas: ${msg}`);
      return { completedCleaned: 0, failedCleaned: 0 };
    }
  }
}
