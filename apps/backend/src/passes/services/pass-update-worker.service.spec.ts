import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { PassUpdateStatus, type PassUpdateTask } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PassUpdateWorkerService } from './pass-update-worker.service.js';

describe('PassUpdateWorkerService', () => {
  let service: PassUpdateWorkerService;
  let prisma: PrismaService;
  let configService: ConfigService;

  const mockPassId = 'p0000000-0000-0000-0000-000000000001';
  const mockTaskId = 't0000000-0000-0000-0000-000000000001';

  const createMockTask = (overrides: Partial<PassUpdateTask> = {}): PassUpdateTask => ({
    id: mockTaskId,
    passId: mockPassId,
    status: PassUpdateStatus.PENDING,
    attempts: 0,
    maxAttempts: 5,
    nextRetryAt: new Date(),
    lastError: null,
    lockedAt: null,
    lockedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(prisma)),
      $queryRaw: vi.fn().mockResolvedValue([]),
      passUpdateTask: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve(createMockTask(data)),
        ),
        update: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve(createMockTask(data)),
        ),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    } as unknown as PrismaService;

    configService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'PASS_UPDATE_POLL_INTERVAL_MS') return '5000';
        if (key === 'PASS_UPDATE_STALE_LOCK_MS') return '120000';
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new PassUpdateWorkerService(prisma, configService);
  });

  afterEach(() => {
    service.onApplicationShutdown();
    vi.restoreAllMocks();
  });

  describe('constructor configuration validation', () => {
    const createMockConfig = (values: Record<string, string | undefined>): ConfigService => ({
      get: vi.fn((key: string) => values[key]),
    } as unknown as ConfigService);

    it('throws error if PASS_UPDATE_POLL_INTERVAL_MS is not a valid integer', () => {
      expect(
        () => new PassUpdateWorkerService(prisma, createMockConfig({ PASS_UPDATE_POLL_INTERVAL_MS: 'abc' })),
      ).toThrow('Variable de configuración inválida: PASS_UPDATE_POLL_INTERVAL_MS');
    });

    it('throws error if PASS_UPDATE_POLL_INTERVAL_MS is negative', () => {
      expect(
        () => new PassUpdateWorkerService(prisma, createMockConfig({ PASS_UPDATE_POLL_INTERVAL_MS: '-5' })),
      ).toThrow('Variable de configuración inválida: PASS_UPDATE_POLL_INTERVAL_MS');
    });

    it('throws error if PASS_UPDATE_STALE_LOCK_MS is not a positive integer', () => {
      expect(
        () => new PassUpdateWorkerService(prisma, createMockConfig({ PASS_UPDATE_STALE_LOCK_MS: '0' })),
      ).toThrow('Variable de configuración inválida: PASS_UPDATE_STALE_LOCK_MS');
      expect(
        () => new PassUpdateWorkerService(prisma, createMockConfig({ PASS_UPDATE_STALE_LOCK_MS: '-100' })),
      ).toThrow('Variable de configuración inválida: PASS_UPDATE_STALE_LOCK_MS');
    });

    it('initializes with default values when config variables are undefined', () => {
      const defaultWorker = new PassUpdateWorkerService(prisma, createMockConfig({}));
      expect(defaultWorker).toBeDefined();
    });
  });

  describe('enqueue', () => {
    it('creates a new PENDING task when no pending task exists for the pass', async () => {
      vi.spyOn(prisma.passUpdateTask, 'findFirst').mockResolvedValue(null);

      const task = await service.enqueue(mockPassId);

      expect(prisma.passUpdateTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          passId: mockPassId,
          status: PassUpdateStatus.PENDING,
        }),
      });
      expect(task.passId).toBe(mockPassId);
    });

    it('consolidates and resets existing PENDING task instead of duplicating', async () => {
      const existing = createMockTask({ attempts: 2 });
      vi.spyOn(prisma.passUpdateTask, 'findFirst').mockResolvedValue(existing);
      vi.spyOn(prisma.passUpdateTask, 'updateMany').mockResolvedValue({ count: 1 });
      vi.spyOn(prisma.passUpdateTask, 'findUnique').mockResolvedValue(existing);

      await service.enqueue(mockPassId);

      expect(prisma.passUpdateTask.create).not.toHaveBeenCalled();
      expect(prisma.passUpdateTask.updateMany).toHaveBeenCalledWith({
        where: { id: existing.id, status: PassUpdateStatus.PENDING },
        data: expect.objectContaining({
          attempts: 0,
        }),
      });
    });

    it('creates a new task if existing task was claimed between findFirst and updateMany', async () => {
      const existing = createMockTask({ attempts: 2 });
      vi.spyOn(prisma.passUpdateTask, 'findFirst').mockResolvedValue(existing);
      vi.spyOn(prisma.passUpdateTask, 'updateMany').mockResolvedValue({ count: 0 });

      await service.enqueue(mockPassId);

      expect(prisma.passUpdateTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          passId: mockPassId,
          status: PassUpdateStatus.PENDING,
        }),
      });
    });

    it('uses provided transaction client tx when enqueuing within a transaction', async () => {
      const txMock = {
        passUpdateTask: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(createMockTask()),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      } as unknown as PrismaService;

      await service.enqueue(mockPassId, txMock);

      expect(txMock.passUpdateTask.create).toHaveBeenCalled();
      expect(prisma.passUpdateTask.create).not.toHaveBeenCalled();
    });
  });

  describe('processSingleTask', () => {
    it('successfully processes task and marks COMPLETED with claim token when dispatcher succeeds', async () => {
      const task = createMockTask();
      const dispatcher = vi.fn().mockResolvedValue(undefined);
      service.registerDispatcher(dispatcher);

      const success = await service.processSingleTask(task);

      expect(success).toBe(true);
      expect(dispatcher).toHaveBeenCalledWith(mockPassId);
      expect(prisma.passUpdateTask.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: task.id,
          status: PassUpdateStatus.PROCESSING,
        }),
        data: expect.objectContaining({
          status: PassUpdateStatus.COMPLETED,
          lockedAt: null,
          lockedBy: null,
          lastError: null,
        }),
      });
    });

    it('does not process if another task for the same pass is already in PROCESSING', async () => {
      const activeTask = createMockTask({
        id: 'other-task-id',
        status: PassUpdateStatus.PROCESSING,
        lockedAt: new Date(),
      });
      vi.spyOn(prisma.passUpdateTask, 'findFirst').mockResolvedValue(activeTask);
      const dispatcher = vi.fn();
      service.registerDispatcher(dispatcher);

      const success = await service.processSingleTask(createMockTask());

      expect(success).toBe(false);
      expect(dispatcher).not.toHaveBeenCalled();
    });

    it('does not process if task is already locked by another worker', async () => {
      vi.spyOn(prisma.passUpdateTask, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.passUpdateTask, 'updateMany').mockResolvedValue({ count: 0 });
      const dispatcher = vi.fn();
      service.registerDispatcher(dispatcher);

      const success = await service.processSingleTask(createMockTask());

      expect(success).toBe(false);
      expect(dispatcher).not.toHaveBeenCalled();
    });

    it('returns false and does not alter task if ownership was lost to another worker after dispatch', async () => {
      const task = createMockTask();
      const dispatcher = vi.fn().mockResolvedValue(undefined);
      service.registerDispatcher(dispatcher);

      vi.spyOn(prisma.passUpdateTask, 'updateMany')
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      const success = await service.processSingleTask(task);

      expect(success).toBe(false);
      expect(dispatcher).toHaveBeenCalledWith(mockPassId);
    });

    it('retries with exponential backoff and keeps PENDING when dispatcher fails', async () => {
      const task = createMockTask({ attempts: 1 });
      const dispatcher = vi.fn().mockRejectedValue(new Error('Google 503 Service Unavailable'));
      service.registerDispatcher(dispatcher);

      const success = await service.processSingleTask(task);

      expect(success).toBe(false);
      expect(prisma.passUpdateTask.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: task.id,
          status: PassUpdateStatus.PROCESSING,
        }),
        data: expect.objectContaining({
          status: PassUpdateStatus.PENDING,
          attempts: 2,
          lastError: 'Google 503 Service Unavailable',
        }),
      });
    });

    it('marks task as FAILED when reaching maxAttempts', async () => {
      const task = createMockTask({ attempts: 4, maxAttempts: 5 });
      const dispatcher = vi.fn().mockRejectedValue(new Error('Persistent network failure'));
      service.registerDispatcher(dispatcher);

      const success = await service.processSingleTask(task);

      expect(success).toBe(false);
      expect(prisma.passUpdateTask.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: task.id,
          status: PassUpdateStatus.PROCESSING,
        }),
        data: expect.objectContaining({
          status: PassUpdateStatus.FAILED,
          attempts: 5,
          lastError: 'Persistent network failure',
        }),
      });
    });
  });

  describe('stateful queue transitions', () => {
    it('prevents reclaiming completed tasks, tasks with future retry, and tasks with active pass locks', async () => {
      const dbTasks = new Map<string, PassUpdateTask>();
      const statefulPrisma = {
        $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(statefulPrisma)),
        $queryRaw: vi.fn().mockResolvedValue([]),
        passUpdateTask: {
          findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
            for (const t of dbTasks.values()) {
              if (where.passId && t.passId !== where.passId) continue;
              if (where.status && t.status !== where.status) continue;
              if (where.id && typeof where.id === 'object' && 'not' in (where.id as Record<string, unknown>)) {
                if (t.id === (where.id as { not: string }).not) continue;
              }
              return t;
            }
            return null;
          }),
          findUnique: vi.fn(async ({ where }: { where: { id: string } }) => dbTasks.get(where.id) ?? null),
          updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Partial<PassUpdateTask> }) => {
            const current = dbTasks.get(where.id as string);
            if (!current) return { count: 0 };
            if (Array.isArray(where.OR)) {
              const matchesOr = where.OR.some((cond: Record<string, unknown>) => {
                if (cond.status && current.status !== cond.status) return false;
                if (cond.nextRetryAt && typeof cond.nextRetryAt === 'object' && 'lte' in (cond.nextRetryAt as Record<string, unknown>)) {
                  if (current.nextRetryAt > (cond.nextRetryAt as { lte: Date }).lte) return false;
                }
                if (cond.lockedAt && typeof cond.lockedAt === 'object' && 'lte' in (cond.lockedAt as Record<string, unknown>)) {
                  if (!current.lockedAt || current.lockedAt > (cond.lockedAt as { lte: Date }).lte) return false;
                }
                return true;
              });
              if (!matchesOr) return { count: 0 };
            }
            if (where.status && current.status !== where.status) return { count: 0 };
            if (where.lockedBy && current.lockedBy !== where.lockedBy) return { count: 0 };
            const updated = { ...current, ...data };
            dbTasks.set(current.id, updated as PassUpdateTask);
            return { count: 1 };
          }),
        },
      } as unknown as PrismaService;

      const statefulService = new PassUpdateWorkerService(statefulPrisma, configService);

      const completedTask = createMockTask({ id: 'task-done', status: PassUpdateStatus.COMPLETED });
      dbTasks.set(completedTask.id, completedTask);
      const resCompleted = await statefulService.processSingleTask(completedTask);
      expect(resCompleted).toBe(false);

      const futureTask = createMockTask({
        id: 'task-future',
        status: PassUpdateStatus.PENDING,
        nextRetryAt: new Date(Date.now() + 60000),
      });
      dbTasks.set(futureTask.id, futureTask);
      statefulService.registerDispatcher(vi.fn().mockResolvedValue(undefined));
      const resFuture = await statefulService.processSingleTask(futureTask);
      expect(resFuture).toBe(false);
    });
  });

  describe('crash recovery & processBatch', () => {
    it('reclaims stale PROCESSING tasks left by a crashed server process', async () => {
      const staleTask = createMockTask({
        status: PassUpdateStatus.PROCESSING,
        lockedAt: new Date(Date.now() - 3 * 60 * 1000),
      });
      vi.spyOn(prisma.passUpdateTask, 'findMany').mockResolvedValue([staleTask]);
      const dispatcher = vi.fn().mockResolvedValue(undefined);
      service.registerDispatcher(dispatcher);

      const processedCount = await service.processBatch();

      expect(processedCount).toBe(1);
      expect(dispatcher).toHaveBeenCalledWith(mockPassId);
      expect(prisma.passUpdateTask.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: staleTask.id }),
        data: expect.objectContaining({
          status: PassUpdateStatus.COMPLETED,
        }),
      });
    });
  });

  describe('cleanupOldTasks', () => {
    it('deletes old completed tasks (>24h) and failed tasks (>7d)', async () => {
      vi.spyOn(prisma.passUpdateTask, 'deleteMany')
        .mockResolvedValueOnce({ count: 15 })
        .mockResolvedValueOnce({ count: 2 });

      const res = await service.cleanupOldTasks();

      expect(res.completedCleaned).toBe(15);
      expect(res.failedCleaned).toBe(2);
      expect(prisma.passUpdateTask.deleteMany).toHaveBeenCalledTimes(2);
    });
  });
});
