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
    this.pollIntervalMs = Number(
      this.configService.get<string>('PASS_UPDATE_POLL_INTERVAL_MS') ??
        DEFAULT_POLL_INTERVAL_MS,
    );
    this.staleLockMs = Number(
      this.configService.get<string>('PASS_UPDATE_STALE_LOCK_MS') ??
        DEFAULT_STALE_LOCK_MS,
    );
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
      return client.passUpdateTask.update({
        where: { id: existingPending.id },
        data: {
          nextRetryAt: now,
          attempts: 0,
          updatedAt: now,
        },
      });
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

    const now = new Date();
    const staleThreshold = new Date(now.getTime() - this.staleLockMs);

    const lockResult = await this.prisma.passUpdateTask.updateMany({
      where: {
        id: task.id,
        OR: [
          { status: PassUpdateStatus.PENDING },
          {
            status: PassUpdateStatus.PROCESSING,
            lockedAt: { lte: staleThreshold },
          },
        ],
      },
      data: {
        status: PassUpdateStatus.PROCESSING,
        lockedAt: now,
        lockedBy: this.workerId,
      },
    });

    if (lockResult.count === 0) {
      return false;
    }

    try {
      await this.dispatcher(task.passId);

      await this.prisma.passUpdateTask.update({
        where: { id: task.id },
        data: {
          status: PassUpdateStatus.COMPLETED,
          lockedAt: null,
          lockedBy: null,
          lastError: null,
        },
      });
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const nextAttempts = task.attempts + 1;
      const isFailed = nextAttempts >= task.maxAttempts;

      const backoffMs = Math.min(1000 * Math.pow(2, nextAttempts), 300000);
      const nextRetryAt = new Date(Date.now() + backoffMs);

      this.logger.warn(
        `[PassUpdateWorker] Intento ${nextAttempts}/${task.maxAttempts} falló para pase ${task.passId}: ${errorMsg}. Reintento en ${Math.round(backoffMs / 1000)}s`,
      );

      await this.prisma.passUpdateTask.update({
        where: { id: task.id },
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
