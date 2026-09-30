import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Paginated,
  TicketDetailDto,
  TicketSummaryDto,
} from '@fidelity/shared';
import { TicketStatus } from '@prisma/client';
import { requireBrandOwner } from '../common/access/brand-access.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  attachmentPath,
  validateImage,
  type UploadedImage,
} from './attachments.js';
import type {
  CreateTicketDto,
  ListTicketsQueryDto,
  ReplyTicketDto,
} from './dto/support.dto.js';
import { SupportStorageService } from './support-storage.service.js';
import {
  ticketDetailInclude,
  ticketSummaryInclude,
  toTicketSummary,
} from './ticket-mapper.js';
import { TicketPresenterService } from './ticket-presenter.service.js';

export const TICKETS_PER_HOUR_LIMIT = 10;

/** Tickets desde el panel del dueño: /api/brands/:brandId/support/tickets. */
@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupportStorageService,
    private readonly presenter: TicketPresenterService,
  ) {}

  async create(
    brandId: string,
    userId: string,
    dto: CreateTicketDto,
    file?: UploadedImage,
  ): Promise<TicketDetailDto> {
    await requireBrandOwner(this.prisma, userId, brandId);
    const image = file ? validateImage(file) : null;

    if (dto.locationId) {
      const location = await this.prisma.merchant.findFirst({
        where: { id: dto.locationId, brandId },
        select: { id: true },
      });
      if (!location)
        throw new BadRequestException(
          'El local indicado no pertenece a tu marca',
        );
    }

    const recent = await this.prisma.ticket.count({
      where: {
        brandId,
        createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recent >= TICKETS_PER_HOUR_LIMIT) {
      throw new HttpException(
        'Recibimos muchas solicitudes seguidas. Intenta de nuevo en un rato.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const ticketId = randomUUID();
    const upload = image
      ? {
          path: attachmentPath(brandId, ticketId, image),
          buffer: image.buffer,
          contentType: image.mimeType,
        }
      : null;

    const ticket = await this.storage.uploadThen(upload, () =>
      this.prisma.ticket.create({
        data: {
          id: ticketId,
          brandId,
          merchantId: dto.locationId ?? null,
          createdByUserId: userId,
          category: dto.category,
          description: dto.description,
          contactPhone: dto.contactPhone ?? null,
          merchantReadAt: new Date(),
          attachments:
            image && upload
              ? {
                  create: {
                    storagePath: upload.path,
                    fileName: image.fileName,
                    mimeType: image.mimeType,
                    sizeBytes: image.sizeBytes,
                    uploadedByUserId: userId,
                  },
                }
              : undefined,
        },
        include: ticketDetailInclude,
      }),
    );

    return this.presenter.forMerchant(ticket);
  }

  async list(
    brandId: string,
    userId: string,
    query: ListTicketsQueryDto,
  ): Promise<Paginated<TicketSummaryDto>> {
    await requireBrandOwner(this.prisma, userId, brandId);
    const where = {
      brandId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: ticketSummaryInclude,
        orderBy: { lastMessageAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items: items.map(toTicketSummary),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  /** Abrir el detalle lo marca como leído por el dueño. */
  async get(
    brandId: string,
    userId: string,
    ticketId: string,
  ): Promise<TicketDetailDto> {
    await requireBrandOwner(this.prisma, userId, brandId);
    await this.findOwnTicket(brandId, ticketId);

    const ticket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { merchantReadAt: new Date() },
      include: ticketDetailInclude,
    });
    return this.presenter.forMerchant(ticket);
  }

  async reply(
    brandId: string,
    userId: string,
    ticketId: string,
    dto: ReplyTicketDto,
    file?: UploadedImage,
  ): Promise<TicketDetailDto> {
    await requireBrandOwner(this.prisma, userId, brandId);
    const image = file ? validateImage(file) : null;
    const current = await this.findOwnTicket(brandId, ticketId);

    if (current.status === TicketStatus.CLOSED) {
      throw new ConflictException(
        'Este ticket está cerrado. Abre uno nuevo si necesitas más ayuda.',
      );
    }

    const nextStatus =
      current.status === TicketStatus.RESOLVED
        ? TicketStatus.OPEN
        : current.status === TicketStatus.WAITING_ON_MERCHANT
          ? TicketStatus.IN_PROGRESS
          : current.status;

    const now = new Date();
    const messageId = randomUUID();
    const upload = image
      ? {
          path: attachmentPath(brandId, ticketId, image),
          buffer: image.buffer,
          contentType: image.mimeType,
        }
      : null;

    const ticket = await this.storage.uploadThen(upload, () =>
      this.prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: nextStatus,
          resolvedAt: nextStatus === TicketStatus.OPEN ? null : undefined,
          lastMessageAt: now,
          merchantReadAt: now,
          messages: {
            create: {
              id: messageId,
              authorUserId: userId,
              authorType: 'MERCHANT',
              body: dto.body,
              attachments:
                image && upload
                  ? {
                      create: {
                        ticketId,
                        storagePath: upload.path,
                        fileName: image.fileName,
                        mimeType: image.mimeType,
                        sizeBytes: image.sizeBytes,
                        uploadedByUserId: userId,
                      },
                    }
                  : undefined,
            },
          },
        },
        include: ticketDetailInclude,
      }),
    );

    return this.presenter.forMerchant(ticket);
  }

  private async findOwnTicket(brandId: string, ticketId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, brandId },
      select: { id: true, status: true },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    return ticket;
  }
}
