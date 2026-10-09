import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { PassUpdateStatus, type PassDeactivationTask } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PassDeactivationWorkerService } from './pass-deactivation-worker.service.js';
import type { GoogleWalletService } from './google-wallet.service.js';

describe('PassDeactivationWorkerService', () => {
  let service: PassDeactivationWorkerService;
  let prisma: PrismaService;
  let configService: ConfigService;
  let googleWalletService: GoogleWalletService;

  const mockPassId = 'p0000000-0000-0000-0000-000000000001';
  const mockTaskId = 'd0000000-0000-0000-0000-000000000001';

  const createMockTask = (
    overrides: Partial<PassDeactivationTask> = {},
  ): PassDeactivationTask => ({
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
      passDeactivationTask: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(({ data }) =>
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

    googleWalletService = {
      deactivateLoyaltyObject: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as GoogleWalletService;

    service = new PassDeactivationWorkerService(
      prisma,
      configService,
      googleWalletService,
    );
  });

  afterEach(() => {
    service.onApplicationShutdown();
    vi.restoreAllMocks();
  });

  describe('enqueue', () => {
    it('creates a new PassDeactivationTask with PENDING status', async () => {
      const task = await service.enqueue(mockPassId);

      expect(prisma.passDeactivationTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          passId: mockPassId,
          status: PassUpdateStatus.PENDING,
        }),
      });
      expect(task.status).toBe(PassUpdateStatus.PENDING);
    });

    it('reuses existing pending task by resetting its nextRetryAt', async () => {
      const existing = createMockTask({ attempts: 3 });
      vi.mocked(prisma.passDeactivationTask.findFirst).mockResolvedValue(existing);
      vi.mocked(prisma.passDeactivationTask.findUnique).mockResolvedValue({
        ...existing,
        attempts: 0,
      });

      const task = await service.enqueue(mockPassId);

      expect(prisma.passDeactivationTask.updateMany).toHaveBeenCalledWith({
        where: { id: existing.id, status: PassUpdateStatus.PENDING },
        data: expect.objectContaining({ attempts: 0 }),
      });
      expect(prisma.passDeactivationTask.create).not.toHaveBeenCalled();
      expect(task.attempts).toBe(0);
    });
  });

  describe('processSingleTask', () => {
    it('successfully processes task and marks it COMPLETED when Google Wallet returns success', async () => {
      const task = createMockTask();
      vi.mocked(googleWalletService.deactivateLoyaltyObject).mockResolvedValue({
        success: true,
      });

      const success = await service.processSingleTask(task);

      expect(success).toBe(true);
      expect(googleWalletService.deactivateLoyaltyObject).toHaveBeenCalledWith(mockPassId);
      expect(prisma.passDeactivationTask.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PassUpdateStatus.COMPLETED,
            lastError: null,
          }),
        }),
      );
    });

    it('marks task COMPLETED when Google Wallet returns 404 notFound (user never saved pass)', async () => {
      const task = createMockTask();
      vi.mocked(googleWalletService.deactivateLoyaltyObject).mockResolvedValue({
        success: true,
        notFound: true,
      });

      const success = await service.processSingleTask(task);

      expect(success).toBe(true);
      expect(prisma.passDeactivationTask.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PassUpdateStatus.COMPLETED,
          }),
        }),
      );
    });

    it('handles temporary failure (e.g. 500 error): increments attempts, sets backoff nextRetryAt, leaves status PENDING', async () => {
      const task = createMockTask({ attempts: 0 });
      vi.mocked(prisma.passDeactivationTask.findUnique).mockResolvedValue(task);
      vi.mocked(googleWalletService.deactivateLoyaltyObject).mockResolvedValue({
        success: false,
        error: 'Google Wallet API error (500): Internal error',
      });

      const success = await service.processSingleTask(task);

      expect(success).toBe(false);
      expect(prisma.passDeactivationTask.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PassUpdateStatus.PENDING,
            attempts: 1,
            lastError: 'Google Wallet API error (500): Internal error',
          }),
        }),
      );
    });

    it('handles thrown exceptions: increments attempts, sets backoff, leaves status PENDING', async () => {
      const task = createMockTask({ attempts: 0 });
      vi.mocked(prisma.passDeactivationTask.findUnique).mockResolvedValue(task);
      vi.mocked(googleWalletService.deactivateLoyaltyObject).mockRejectedValue(
        new Error('Network connection timeout'),
      );

      const success = await service.processSingleTask(task);

      expect(success).toBe(false);
      expect(prisma.passDeactivationTask.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PassUpdateStatus.PENDING,
            attempts: 1,
            lastError: 'Network connection timeout',
          }),
        }),
      );
    });

    it('marks task FAILED when maxAttempts is reached', async () => {
      const task = createMockTask({ attempts: 4, maxAttempts: 5 });
      vi.mocked(prisma.passDeactivationTask.findUnique).mockResolvedValue(task);
      vi.mocked(googleWalletService.deactivateLoyaltyObject).mockResolvedValue({
        success: false,
        error: 'Persistent 503 error',
      });

      const success = await service.processSingleTask(task);

      expect(success).toBe(false);
      expect(prisma.passDeactivationTask.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PassUpdateStatus.FAILED,
            attempts: 5,
            lastError: 'Persistent 503 error',
          }),
        }),
      );
    });
  });

  describe('recovery & batch processing', () => {
    it('recovers pending tasks in processBatch and dispatches them', async () => {
      const pendingTask = createMockTask({ attempts: 1 });
      vi.mocked(prisma.passDeactivationTask.findMany).mockResolvedValue([pendingTask]);
      vi.mocked(googleWalletService.deactivateLoyaltyObject).mockResolvedValue({
        success: true,
      });

      const processedCount = await service.processBatch(10);

      expect(processedCount).toBe(1);
      expect(googleWalletService.deactivateLoyaltyObject).toHaveBeenCalledWith(mockPassId);
    });

    it('cleans up old completed and failed tasks past retention window', async () => {
      vi.mocked(prisma.passDeactivationTask.deleteMany)
        .mockResolvedValueOnce({ count: 5 })
        .mockResolvedValueOnce({ count: 2 });

      const result = await service.cleanupOldTasks();

      expect(result).toEqual({
        completedCleaned: 5,
        failedCleaned: 2,
      });
    });
  });
});
