import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { InternalTicketsService } from './internal-tickets.service.js';
import type { SupportStorageService } from './support-storage.service.js';
import type { TicketPresenterService } from './ticket-presenter.service.js';

describe('InternalTicketsService', () => {
  let prisma: any;
  let service: InternalTicketsService;

  const ticket = (status: string) => ({
    id: 't-1',
    brandId: 'b-1',
    status,
    priority: 'NORMAL',
    assigneeUserId: null,
  });

  beforeEach(() => {
    prisma = {
      ticket: {
        findUnique: vi.fn().mockResolvedValue(ticket('OPEN')),
        update: vi.fn((args: { data: object }) =>
          Promise.resolve({ ...ticket('OPEN'), ...args.data }),
        ),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      platformAdmin: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ userId: 'agent', role: 'SUPPORT' }),
      },
      auditLog: { create: vi.fn() },
      $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    const storage = {
      uploadThen: vi.fn((file: unknown, persist: () => Promise<unknown>) =>
        persist(),
      ),
    };
    const presenter = {
      forPlatform: vi.fn((t: unknown) => Promise.resolve(t)),
    };
    service = new InternalTicketsService(
      prisma as PrismaService,
      storage as unknown as SupportStorageService,
      presenter as unknown as TicketPresenterService,
    );
  });

  describe('update', () => {
    it('rejects transitions outside the shared contract', async () => {
      prisma.ticket.findUnique.mockResolvedValue(ticket('IN_PROGRESS'));
      await expect(
        service.update('t-1', 'admin', { status: 'CLOSED' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.ticket.update).not.toHaveBeenCalled();
    });

    it('stamps resolvedAt and writes the change to AuditLog', async () => {
      prisma.ticket.findUnique.mockResolvedValue(ticket('IN_PROGRESS'));
      await service.update('t-1', 'admin', {
        status: 'RESOLVED',
        priority: 'HIGH',
      });

      const { data } = prisma.ticket.update.mock.calls[0][0];
      expect(data).toMatchObject({
        status: 'RESOLVED',
        priority: 'HIGH',
        closedAt: null,
      });
      expect(data.resolvedAt).toBeInstanceOf(Date);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorUserId: 'admin',
          actorType: 'PLATFORM',
          action: 'ticket.update',
          entityId: 't-1',
          before: {
            status: 'IN_PROGRESS',
            priority: 'NORMAL',
            assigneeUserId: null,
          },
        }),
      });
    });

    it('returns 409 instead of overwriting a status that changed concurrently', async () => {
      prisma.ticket.findUnique.mockResolvedValue(ticket('IN_PROGRESS'));
      prisma.ticket.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('No record', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.update('t-1', 'admin', { status: 'RESOLVED' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.ticket.update.mock.calls[0][0].where).toEqual({
        id: 't-1',
        status: 'IN_PROGRESS',
      });
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('only assigns tickets to platform admins', async () => {
      prisma.platformAdmin.findUnique.mockResolvedValue(null);
      await expect(
        service.update('t-1', 'admin', {
          assigneeId: '00000000-0000-4000-8000-000000000001',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('does nothing (and audits nothing) when nothing changes', async () => {
      await service.update('t-1', 'admin', { status: 'OPEN' });
      expect(prisma.ticket.update).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('reply', () => {
    const replyData = async (
      status: string,
      dto: { body: string; isInternal: boolean; status?: 'RESOLVED' },
    ) => {
      prisma.ticket.findUnique.mockResolvedValue(ticket(status));
      await service.reply('t-1', 'agent', dto);
      return prisma.ticket.update.mock.calls.at(-1)[0].data;
    };

    it('a public reply waits on the merchant and counts as unread for them', async () => {
      const data = await replyData('OPEN', { body: 'hola', isInternal: false });
      expect(data.status).toBe('WAITING_ON_MERCHANT');
      expect(data.lastPublicReplyAt).toBeInstanceOf(Date);
    });

    it('an internal note changes neither the status nor what the merchant sees', async () => {
      const data = await replyData('IN_PROGRESS', {
        body: 'nota',
        isInternal: true,
      });
      expect(data.status).toBeUndefined();
      expect(data.lastPublicReplyAt).toBeUndefined();
      expect(data.lastMessageAt).toBeUndefined();
      expect(data.messages.create).toMatchObject({
        isInternal: true,
        authorType: 'PLATFORM',
      });
    });

    it('can reply and resolve in one step, validating the transition', async () => {
      const data = await replyData('WAITING_ON_MERCHANT', {
        body: 'listo',
        isInternal: false,
        status: 'RESOLVED',
      });
      expect(data.status).toBe('RESOLVED');
      await expect(
        replyData('CLOSED', { body: 'x', isInternal: false }),
      ).rejects.toThrow(ConflictException);
    });
  });

  it('auto-closes only RESOLVED tickets older than 7 days', async () => {
    const now = new Date('2026-10-20T12:00:00Z');
    expect(await service.closeStaleResolved(now)).toBe(2);
    expect(prisma.ticket.updateMany).toHaveBeenCalledWith({
      where: {
        status: 'RESOLVED',
        resolvedAt: { lt: new Date('2026-10-13T12:00:00Z') },
      },
      data: { status: 'CLOSED', closedAt: now },
    });
  });
});
