import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TICKET_AUTO_CLOSE_DAYS,
  canTransition,
  type InternalTicketDto,
  type Paginated,
  type TicketStatus,
} from '@fidelity/shared';
import { Prisma, TicketStatus as DbTicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  attachmentPath,
  sanitizeImage,
  type UploadedImage,
} from './attachments.js';
import type {
  InternalReplyTicketDto,
  ListInternalTicketsQueryDto,
  UpdateTicketDto,
} from './dto/support.dto.js';
import { SupportStorageService } from './support-storage.service.js';
import { ticketDetailInclude } from './ticket-mapper.js';
import { failOnStaleStatus } from './stale-ticket.js';
import { TicketPresenterService } from './ticket-presenter.service.js';

/** Campos que dependen del estado al que llega el ticket. */
function statusTimestamps(to: TicketStatus, now: Date) {
  return {
    resolvedAt:
      to === DbTicketStatus.RESOLVED
        ? now
        : to === DbTicketStatus.CLOSED
          ? undefined
          : null,
    closedAt: to === DbTicketStatus.CLOSED ? now : null,
  };
}

/** Tickets desde el panel interno: /api/internal/tickets. */
@Injectable()
export class InternalTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupportStorageService,
    private readonly presenter: TicketPresenterService,
  ) {}

  async list(
    query: ListInternalTicketsQueryDto,
  ): Promise<Paginated<InternalTicketDto>> {
    const where: Prisma.TicketWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.assigneeId
        ? {
            assigneeUserId:
              query.assigneeId === 'none' ? null : query.assigneeId,
          }
        : {}),
      ...(query.q ? { OR: this.searchFilters(query.q) } : {}),
    };

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: ticketDetailInclude,
        orderBy: { lastMessageAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    const items = await Promise.all(
      tickets.map((t) => this.presenter.forPlatform(t)),
    );
    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  async get(ticketId: string): Promise<InternalTicketDto> {
    return this.presenter.forPlatform(await this.findTicket(ticketId));
  }

  async update(
    ticketId: string,
    actorUserId: string,
    dto: UpdateTicketDto,
  ): Promise<InternalTicketDto> {
    const current = await this.findTicket(ticketId);
    const now = new Date();
    const data: Prisma.TicketUpdateInput = {};

    if (dto.status && dto.status !== current.status) {
      if (!canTransition(current.status, dto.status)) {
        throw new ConflictException(
          `No se puede pasar un ticket de ${current.status} a ${dto.status}`,
        );
      }
      Object.assign(data, {
        status: dto.status,
        ...statusTimestamps(dto.status, now),
      });
    }

    if (dto.priority && dto.priority !== current.priority) {
      data.priority = dto.priority;
    }

    if (
      dto.assigneeId !== undefined &&
      dto.assigneeId !== current.assigneeUserId
    ) {
      if (dto.assigneeId !== null) {
        const admin = await this.prisma.platformAdmin.findUnique({
          where: { userId: dto.assigneeId },
        });
        if (!admin)
          throw new BadRequestException(
            'Solo se puede asignar a alguien del equipo interno',
          );
      }
      data.assigneeUserId = dto.assigneeId;
    }

    if (Object.keys(data).length === 0) {
      return this.presenter.forPlatform(current);
    }

    const before = {
      status: current.status,
      priority: current.priority,
      assigneeUserId: current.assigneeUserId,
    };
    const ticket = await failOnStaleStatus(
      this.prisma.$transaction(async (tx) => {
        const updated = await tx.ticket.update({
          where: { id: ticketId, status: current.status },
          data,
          include: ticketDetailInclude,
        });
        await tx.auditLog.create({
          data: {
            actorUserId,
            actorType: 'PLATFORM',
            action: 'ticket.update',
            entity: 'Ticket',
            entityId: ticketId,
            before,
            after: {
              status: updated.status,
              priority: updated.priority,
              assigneeUserId: updated.assigneeUserId,
            },
          },
        });
        return updated;
      }),
    );

    return this.presenter.forPlatform(ticket);
  }

  async reply(
    ticketId: string,
    actorUserId: string,
    dto: InternalReplyTicketDto,
    file?: UploadedImage,
  ): Promise<InternalTicketDto> {
    const image = file ? await sanitizeImage(file) : null;
    const current = await this.findTicket(ticketId);

    if (current.status === DbTicketStatus.CLOSED) {
      throw new ConflictException('El ticket está cerrado');
    }

    const now = new Date();
    const nextStatus = this.statusAfterReply(current.status, dto);
    const upload = image
      ? {
          path: attachmentPath(current.brandId, ticketId, image),
          buffer: image.buffer,
          contentType: image.mimeType,
        }
      : null;

    const ticket = await failOnStaleStatus(
      this.storage.uploadThen(upload, () =>
        this.prisma.ticket.update({
          where: { id: ticketId, status: current.status },
          data: {
            ...(nextStatus !== current.status
              ? { status: nextStatus, ...statusTimestamps(nextStatus, now) }
              : {}),
            ...(dto.isInternal
              ? {}
              : { lastMessageAt: now, lastPublicReplyAt: now }),
            messages: {
              create: {
                id: randomUUID(),
                authorUserId: actorUserId,
                authorType: 'PLATFORM',
                body: dto.body,
                isInternal: dto.isInternal,
                attachments:
                  image && upload
                    ? {
                        create: {
                          ticketId,
                          storagePath: upload.path,
                          fileName: image.fileName,
                          mimeType: image.mimeType,
                          sizeBytes: image.sizeBytes,
                          uploadedByUserId: actorUserId,
                        },
                      }
                    : undefined,
              },
            },
          },
          include: ticketDetailInclude,
        }),
      ),
    );

    return this.presenter.forPlatform(ticket);
  }

  /** Cierra los RESOLVED sin respuesta del dueño pasados TICKET_AUTO_CLOSE_DAYS. */
  async closeStaleResolved(now = new Date()): Promise<number> {
    const cutoff = new Date(
      now.getTime() - TICKET_AUTO_CLOSE_DAYS * 24 * 60 * 60 * 1000,
    );
    const { count } = await this.prisma.ticket.updateMany({
      where: { status: DbTicketStatus.RESOLVED, resolvedAt: { lt: cutoff } },
      data: { status: DbTicketStatus.CLOSED, closedAt: now },
    });
    return count;
  }

  private statusAfterReply(
    current: TicketStatus,
    dto: InternalReplyTicketDto,
  ): TicketStatus {
    if (dto.status && dto.status !== current) {
      if (!canTransition(current, dto.status)) {
        throw new ConflictException(
          `No se puede pasar un ticket de ${current} a ${dto.status}`,
        );
      }
      return dto.status;
    }
    if (dto.isInternal || dto.status) return current;
    return current === DbTicketStatus.OPEN ||
      current === DbTicketStatus.IN_PROGRESS
      ? DbTicketStatus.WAITING_ON_MERCHANT
      : current;
  }

  private searchFilters(q: string): Prisma.TicketWhereInput[] {
    const term = q.trim().replace(/^#/, '');
    const filters: Prisma.TicketWhereInput[] = [
      { description: { contains: term, mode: 'insensitive' } },
      { brand: { name: { contains: term, mode: 'insensitive' } } },
    ];
    if (/^\d{1,9}$/.test(term)) filters.push({ number: Number(term) });
    return filters;
  }

  private async findTicket(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: ticketDetailInclude,
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    return ticket;
  }
}
