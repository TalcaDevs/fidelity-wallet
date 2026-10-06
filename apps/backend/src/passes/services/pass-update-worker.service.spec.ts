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
          update: vi.fn(),
        },
      } as unknown as PrismaService;

      await service.enqueue(mockPassId, txMock);

      expect(txMock.passUpdateTask.create).toHaveBeenCalled();
      expect(prisma.passUpdateTask.create).not.toHaveBeenCalled();
    });
  });

  describe('processSingleTask', () => {
    it('successfully processes task and marks COMPLETED when dispatcher succeeds', async () => {
      const task = createMockTask();
      const dispatcher = vi.fn().mockResolvedValue(undefined);
      service.registerDispatcher(dispatcher);

      const success = await service.processSingleTask(task);

      expect(success).toBe(true);
      expect(dispatcher).toHaveBeenCalledWith(mockPassId);
      expect(prisma.passUpdateTask.update).toHaveBeenCalledWith({
        where: { id: task.id },
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

    it('retries with exponential backoff and keeps PENDING when dispatcher fails', async () => {
      const task = createMockTask({ attempts: 1 });
      const dispatcher = vi.fn().mockRejectedValue(new Error('Google 503 Service Unavailable'));
      service.registerDispatcher(dispatcher);

      const success = await service.processSingleTask(task);

      expect(success).toBe(false);
      expect(prisma.passUpdateTask.update).toHaveBeenCalledWith({
        where: { id: task.id },
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
      expect(prisma.passUpdateTask.update).toHaveBeenCalledWith({
        where: { id: task.id },
        data: expect.objectContaining({
          status: PassUpdateStatus.FAILED,
          attempts: 5,
          lastError: 'Persistent network failure',
        }),
      });
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
      expect(prisma.passUpdateTask.update).toHaveBeenCalledWith({
        where: { id: staleTask.id },
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
