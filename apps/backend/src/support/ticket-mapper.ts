import type {
  InternalTicketDto,
  TicketAttachmentDto,
  TicketAttachmentMimeType,
  TicketDetailDto,
  TicketMessageDto,
  TicketSummaryDto,
} from '@fidelity/shared';
import type { Prisma, TicketAttachment } from '@prisma/client';
import type { UserInfo } from '../common/users/user-directory.service.js';

export const SUPPORT_TEAM_NAME = 'Equipo de soporte';
const EXCERPT_LENGTH = 120;

export const ticketSummaryInclude = {
  merchant: { select: { name: true } },
} satisfies Prisma.TicketInclude;

export const ticketDetailInclude = {
  merchant: { select: { name: true } },
  brand: { select: { name: true } },
  attachments: { where: { messageId: null }, orderBy: { createdAt: 'asc' } },
  messages: {
    orderBy: { createdAt: 'asc' },
    include: { attachments: { orderBy: { createdAt: 'asc' } } },
  },
} satisfies Prisma.TicketInclude;

type TicketWithLocation = Prisma.TicketGetPayload<{
  include: typeof ticketSummaryInclude;
}>;
export type TicketWithDetail = Prisma.TicketGetPayload<{
  include: typeof ticketDetailInclude;
}>;

export type Viewer = 'MERCHANT' | 'PLATFORM';

export interface DetailContext {
  urls: Map<string, string>;
  users: Map<string, UserInfo>;
}

export function isUnreadForMerchant(ticket: {
  lastPublicReplyAt: Date | null;
  merchantReadAt: Date | null;
}): boolean {
  return (
    ticket.lastPublicReplyAt !== null &&
    (ticket.merchantReadAt === null ||
      ticket.lastPublicReplyAt > ticket.merchantReadAt)
  );
}

export function toTicketSummary(ticket: TicketWithLocation): TicketSummaryDto {
  return {
    id: ticket.id,
    number: ticket.number,
    category: ticket.category,
    status: ticket.status,
    excerpt: ticket.description.slice(0, EXCERPT_LENGTH),
    locationId: ticket.merchantId,
    locationName: ticket.merchant?.name ?? null,
    lastMessageAt: ticket.lastMessageAt.toISOString(),
    createdAt: ticket.createdAt.toISOString(),
    unreadForMerchant: isUnreadForMerchant(ticket),
  };
}

/** Todas las rutas de Storage que la vista necesita firmar. */
export function attachmentPaths(
  ticket: TicketWithDetail,
  viewer: Viewer,
): string[] {
  return [
    ...ticket.attachments,
    ...visibleMessages(ticket, viewer).flatMap((m) => m.attachments),
  ].map((a) => a.storagePath);
}

/** Usuarios cuyos nombres necesita la vista. */
export function referencedUserIds(ticket: TicketWithDetail): string[] {
  return [
    ticket.createdByUserId,
    ...(ticket.assigneeUserId ? [ticket.assigneeUserId] : []),
    ...ticket.messages.map((m) => m.authorUserId),
  ];
}

export function toTicketDetail(
  ticket: TicketWithDetail,
  viewer: Viewer,
  ctx: DetailContext,
): TicketDetailDto {
  return {
    ...toTicketSummary(ticket),
    description: ticket.description,
    contactPhone: ticket.contactPhone,
    attachments: ticket.attachments.map((a) => toAttachment(a, ctx.urls)),
    messages: visibleMessages(ticket, viewer).map((m) =>
      toMessage(m, viewer, ctx),
    ),
  };
}

export function toInternalTicket(
  ticket: TicketWithDetail,
  ctx: DetailContext,
): InternalTicketDto {
  const creator = ctx.users.get(ticket.createdByUserId);
  return {
    ...toTicketDetail(ticket, 'PLATFORM', ctx),
    brandId: ticket.brandId,
    brandName: ticket.brand.name,
    priority: ticket.priority,
    assignee: ticket.assigneeUserId
      ? {
          userId: ticket.assigneeUserId,
          name: displayName(ctx.users.get(ticket.assigneeUserId)),
        }
      : null,
    createdBy: {
      userId: ticket.createdByUserId,
      email: creator?.email ?? null,
    },
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
  };
}

function visibleMessages(ticket: TicketWithDetail, viewer: Viewer) {
  return viewer === 'MERCHANT'
    ? ticket.messages.filter((m) => !m.isInternal)
    : ticket.messages;
}

function toMessage(
  message: TicketWithDetail['messages'][number],
  viewer: Viewer,
  ctx: DetailContext,
): TicketMessageDto {
  const authorName =
    message.authorType === 'PLATFORM' && viewer === 'MERCHANT'
      ? SUPPORT_TEAM_NAME
      : displayName(ctx.users.get(message.authorUserId));
  return {
    id: message.id,
    authorType: message.authorType,
    authorName,
    body: message.body,
    isInternal: message.isInternal,
    attachments: message.attachments.map((a) => toAttachment(a, ctx.urls)),
    createdAt: message.createdAt.toISOString(),
  };
}

function toAttachment(
  attachment: TicketAttachment,
  urls: Map<string, string>,
): TicketAttachmentDto {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType as TicketAttachmentMimeType,
    sizeBytes: attachment.sizeBytes,
    url: urls.get(attachment.storagePath) ?? '',
  };
}

function displayName(user: UserInfo | undefined): string {
  return user?.name ?? user?.email ?? 'Usuario';
}
