import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SupportStorageService } from './support-storage.service.js';
import { SupportService } from './support.service.js';
import type { TicketPresenterService } from './ticket-presenter.service.js';

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const upload = {
  buffer: png,
  originalname: 'c.png',
  mimetype: 'image/png',
  size: png.length,
};

describe('SupportService', () => {
  let prisma: any;
  let storage: any;
  let service: SupportService;

  beforeEach(() => {
    prisma = {
      brandMember: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ role: 'OWNER', merchantId: null }),
      },
      merchant: { findFirst: vi.fn().mockResolvedValue({ id: 'm-1' }) },
      ticket: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({ id: 't-1' }),
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: 't-1', status: 'WAITING_ON_MERCHANT' }),
        update: vi.fn().mockResolvedValue({ id: 't-1' }),
      },
    };
    storage = {
      uploadThen: vi.fn((file: unknown, persist: () => Promise<unknown>) =>
        persist(),
      ),
    };
    const presenter = {
      forMerchant: vi.fn((t: unknown) => Promise.resolve(t)),
    };
    service = new SupportService(
      prisma as PrismaService,
      storage as SupportStorageService,
      presenter as unknown as TicketPresenterService,
    );
  });

  const dto = {
    category: 'SCANNER' as const,
    description: 'La cámara del local no enfoca.',
  };

  it('only lets the brand OWNER create tickets', async () => {
    prisma.brandMember.findUnique.mockResolvedValue({
      role: 'STAFF',
      merchantId: 'm-1',
    });
    await expect(service.create('b-1', 'staff', dto)).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.ticket.create).not.toHaveBeenCalled();
  });

  it('rejects a location from another brand', async () => {
    prisma.merchant.findFirst.mockResolvedValue(null);
    await expect(
      service.create('b-1', 'owner', { ...dto, locationId: 'm-ajeno' }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
      where: { id: 'm-ajeno', brandId: 'b-1' },
      select: { id: true },
    });
  });

  it('limits a brand to 10 tickets per hour', async () => {
    prisma.ticket.count.mockResolvedValue(10);
    await expect(service.create('b-1', 'owner', dto)).rejects.toMatchObject({
      status: 429,
    });
    await expect(service.create('b-1', 'owner', dto)).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it('uploads the attachment under the brand and ticket path before persisting', async () => {
    await service.create('b-1', 'owner', dto, upload);

    const [file] = storage.uploadThen.mock.calls[0];
    expect(file.path).toMatch(/^b-1\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/);
    const data = prisma.ticket.create.mock.calls[0][0].data;
    expect(data.id).toBe(file.path.split('/')[1]);
    expect(data.attachments.create).toMatchObject({
      storagePath: file.path,
      mimeType: 'image/png',
    });
  });

  it('does not show tickets of another brand', async () => {
    prisma.ticket.findFirst.mockResolvedValue(null);
    await expect(service.get('b-1', 'owner', 't-otro')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  describe('reply', () => {
    const statusAfterReply = async (current: string) => {
      prisma.ticket.findFirst.mockResolvedValue({ id: 't-1', status: current });
      await service.reply('b-1', 'owner', 't-1', { body: 'hola' });
      return prisma.ticket.update.mock.calls.at(-1)[0].data;
    };

    it('moves WAITING_ON_MERCHANT to IN_PROGRESS and reopens RESOLVED as OPEN', async () => {
      expect((await statusAfterReply('WAITING_ON_MERCHANT')).status).toBe(
        'IN_PROGRESS',
      );
      const reopened = await statusAfterReply('RESOLVED');
      expect(reopened).toMatchObject({ status: 'OPEN', resolvedAt: null });
      expect((await statusAfterReply('IN_PROGRESS')).status).toBe(
        'IN_PROGRESS',
      );
    });

    it('refuses to reply to a CLOSED ticket', async () => {
      prisma.ticket.findFirst.mockResolvedValue({
        id: 't-1',
        status: 'CLOSED',
      });
      await expect(
        service.reply('b-1', 'owner', 't-1', { body: 'hola' }),
      ).rejects.toThrow(ConflictException);
    });

    it('marks its own reply as read', async () => {
      const data = await statusAfterReply('IN_PROGRESS');
      expect(data.merchantReadAt).toEqual(data.lastMessageAt);
      expect(data.messages.create).toMatchObject({
        authorType: 'MERCHANT',
        body: 'hola',
      });
    });
  });
});
