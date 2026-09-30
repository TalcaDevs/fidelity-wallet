import { describe, expect, it } from 'vitest';
import {
  SUPPORT_TEAM_NAME,
  attachmentPaths,
  isUnreadForMerchant,
  toInternalTicket,
  toTicketDetail,
  type TicketWithDetail,
} from './ticket-mapper.js';

const at = (iso: string) => new Date(iso);

const attachment = (id: string, messageId: string | null) => ({
  id,
  ticketId: 't-1',
  messageId,
  storagePath: `b/t-1/${id}.png`,
  fileName: `${id}.png`,
  mimeType: 'image/png',
  sizeBytes: 10,
  uploadedByUserId: 'owner',
  createdAt: at('2026-10-01T10:00:00Z'),
});

const ticket = {
  id: 't-1',
  number: 1000,
  brandId: 'b',
  merchantId: 'm',
  createdByUserId: 'owner',
  category: 'SCANNER',
  status: 'WAITING_ON_MERCHANT',
  priority: 'HIGH',
  description: 'x'.repeat(200),
  contactPhone: null,
  assigneeUserId: 'agent',
  lastMessageAt: at('2026-10-01T12:00:00Z'),
  lastPublicReplyAt: at('2026-10-01T12:00:00Z'),
  merchantReadAt: at('2026-10-01T11:00:00Z'),
  resolvedAt: null,
  closedAt: null,
  createdAt: at('2026-10-01T10:00:00Z'),
  updatedAt: at('2026-10-01T12:00:00Z'),
  merchant: { name: 'Centro' },
  brand: { name: 'Café Demo' },
  attachments: [attachment('a0', null)],
  messages: [
    {
      id: 'm1',
      ticketId: 't-1',
      authorUserId: 'agent',
      authorType: 'PLATFORM',
      body: 'nota',
      isInternal: true,
      createdAt: at('2026-10-01T11:30:00Z'),
      attachments: [attachment('a1', 'm1')],
    },
    {
      id: 'm2',
      ticketId: 't-1',
      authorUserId: 'agent',
      authorType: 'PLATFORM',
      body: 'hola',
      isInternal: false,
      createdAt: at('2026-10-01T12:00:00Z'),
      attachments: [],
    },
  ],
} as unknown as TicketWithDetail;

const ctx = {
  urls: new Map([
    ['b/t-1/a0.png', 'signed-a0'],
    ['b/t-1/a1.png', 'signed-a1'],
  ]),
  users: new Map([
    ['agent', { name: 'Ana Soporte', email: 'ana@nosotros.cl' }],
    ['owner', { name: null, email: 'owner@example.com' }],
  ]),
};

describe('ticket mapper', () => {
  it('hides internal notes and their attachments from the merchant, and names the team generically', () => {
    const dto = toTicketDetail(ticket, 'MERCHANT', ctx);

    expect(dto.messages.map((m) => m.id)).toEqual(['m2']);
    expect(dto.messages[0].authorName).toBe(SUPPORT_TEAM_NAME);
    expect(attachmentPaths(ticket, 'MERCHANT')).toEqual(['b/t-1/a0.png']);
    expect(dto.excerpt).toHaveLength(120);
    expect(dto.attachments[0].url).toBe('signed-a0');
  });

  it('shows everything to the platform with real names', () => {
    const dto = toInternalTicket(ticket, ctx);

    expect(dto.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(dto.messages[0].authorName).toBe('Ana Soporte');
    expect(dto.assignee).toEqual({ userId: 'agent', name: 'Ana Soporte' });
    expect(dto.createdBy).toEqual({
      userId: 'owner',
      email: 'owner@example.com',
    });
    expect(attachmentPaths(ticket, 'PLATFORM')).toHaveLength(2);
  });

  it('is unread only when the team replied after the merchant last opened it', () => {
    expect(
      isUnreadForMerchant({ lastPublicReplyAt: null, merchantReadAt: null }),
    ).toBe(false);
    expect(
      isUnreadForMerchant({
        lastPublicReplyAt: at('2026-10-02'),
        merchantReadAt: null,
      }),
    ).toBe(true);
    expect(
      isUnreadForMerchant({
        lastPublicReplyAt: at('2026-10-02'),
        merchantReadAt: at('2026-10-01'),
      }),
    ).toBe(true);
    expect(
      isUnreadForMerchant({
        lastPublicReplyAt: at('2026-10-01'),
        merchantReadAt: at('2026-10-02'),
      }),
    ).toBe(false);
  });
});
