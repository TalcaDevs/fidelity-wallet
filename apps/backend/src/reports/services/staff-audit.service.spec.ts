import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StaffAuditService } from './staff-audit.service.js';

describe('StaffAuditService', () => {
  let service: StaffAuditService;
  let prisma: PrismaService;

  const scope = {
    brandId: 'b0000000-0000-0000-0000-000000000001',
    merchantId: 'a0000000-0000-0000-0000-000000000001',
  };

  beforeEach(() => {
    prisma = {
      brandMember: { findMany: vi.fn() },
      scan: { findMany: vi.fn() },
    } as unknown as PrismaService;

    service = new StaffAuditService(prisma);
  });

  it('retorna lista vacía si no hay miembros ni actividad', async () => {
    (prisma.brandMember.findMany as any).mockResolvedValue([]);
    (prisma.scan.findMany as any).mockResolvedValue([]);

    const result = await service.getStaffActivity(scope, {});
    expect(result.staff).toEqual([]);
  });

  it('ordena el staff descendentemente por total de operaciones', async () => {
    (prisma.brandMember.findMany as any).mockResolvedValue([
      { userId: 'user-low', role: 'STAFF' },
      { userId: 'user-high', role: 'STAFF' },
    ]);
    (prisma.scan.findMany as any).mockResolvedValue([
      {
        id: 's-1',
        type: 'STAMP_ADDED',
        method: 'QR',
        passId: 'p-1',
        createdByUserId: 'user-low',
        createdAt: new Date(),
      },
      {
        id: 's-2',
        type: 'STAMP_ADDED',
        method: 'QR',
        passId: 'p-2',
        createdByUserId: 'user-high',
        createdAt: new Date(),
      },
      {
        id: 's-3',
        type: 'STAMP_ADDED',
        method: 'QR',
        passId: 'p-3',
        createdByUserId: 'user-high',
        createdAt: new Date(),
      },
    ]);

    const result = await service.getStaffActivity(scope, {});
    expect(result.staff.length).toBe(2);
    expect(result.staff[0].userId).toBe('user-high');
    expect(result.staff[0].stampsCount).toBe(2);
    expect(result.staff[1].userId).toBe('user-low');
    expect(result.staff[1].stampsCount).toBe(1);
  });
});
