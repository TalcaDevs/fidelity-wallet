import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserDirectoryService } from '../../common/users/user-directory.service.js';
import { StaffAuditService } from './staff-audit.service.js';

describe('StaffAuditService', () => {
  let service: StaffAuditService;
  let prisma: PrismaService;
  let users: UserDirectoryService;

  const scope = {
    brandId: 'b0000000-0000-0000-0000-000000000001',
    merchantId: 'a0000000-0000-0000-0000-000000000001',
  };

  beforeEach(() => {
    prisma = {
      brandMember: { findMany: vi.fn() },
      scan: { findMany: vi.fn() },
    } as unknown as PrismaService;

    users = {
      lookup: vi.fn().mockResolvedValue(
        new Map([
          ['user-low', { name: 'Cajero Bajo', email: 'low@test.cl' }],
          ['user-high', { name: 'Cajero Alto', email: 'high@test.cl' }],
        ]),
      ),
    } as unknown as UserDirectoryService;

    service = new StaffAuditService(prisma, users);
  });

  it('retorna lista vacía si no hay miembros ni actividad', async () => {
    (prisma.brandMember.findMany as any).mockResolvedValue([]);
    (prisma.scan.findMany as any).mockResolvedValue([]);

    const result = await service.getStaffActivity(scope, {});
    expect(result.staff).toEqual([]);
  });

  it('ordena el staff descendentemente por total de operaciones y pobla staffName', async () => {
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
        stampCount: 1,
      },
      {
        id: 's-2',
        type: 'STAMP_ADDED',
        method: 'QR',
        passId: 'p-2',
        createdByUserId: 'user-high',
        createdAt: new Date(),
        stampCount: 2,
      },
      {
        id: 's-3',
        type: 'STAMP_ADDED',
        method: 'QR',
        passId: 'p-3',
        createdByUserId: 'user-high',
        createdAt: new Date(),
        stampCount: 1,
      },
    ]);

    const result = await service.getStaffActivity(scope, {});
    expect(result.staff).toHaveLength(2);
    expect(result.staff[0].userId).toBe('user-high');
    expect(result.staff[0].staffName).toBe('Cajero Alto');
    expect(result.staff[0].stampsCount).toBe(3); // 2 + 1
    expect(result.staff[1].userId).toBe('user-low');
    expect(result.staff[1].staffName).toBe('Cajero Bajo');
    expect(result.staff[1].stampsCount).toBe(1);
  });
  it('genera alerta EXCESSIVE_STAMPS_SAME_CUSTOMER con el nombre del cajero', async () => {
    (prisma.brandMember.findMany as any).mockResolvedValue([
      { userId: 'user-high', role: 'STAFF' },
    ]);
    const baseDate = new Date('2026-09-01T12:00:00Z');
    (prisma.scan.findMany as any).mockResolvedValue([
      { id: 's-1', type: 'STAMP_ADDED', method: 'QR', passId: 'p-1', createdByUserId: 'user-high', createdAt: new Date(baseDate.getTime() + 1000), stampCount: 1 },
      { id: 's-2', type: 'STAMP_ADDED', method: 'QR', passId: 'p-1', createdByUserId: 'user-high', createdAt: new Date(baseDate.getTime() + 2000), stampCount: 1 },
      { id: 's-3', type: 'STAMP_ADDED', method: 'QR', passId: 'p-1', createdByUserId: 'user-high', createdAt: new Date(baseDate.getTime() + 3000), stampCount: 1 },
      { id: 's-4', type: 'STAMP_ADDED', method: 'QR', passId: 'p-1', createdByUserId: 'user-high', createdAt: new Date(baseDate.getTime() + 4000), stampCount: 1 },
    ]);

    const result = await service.getStaffActivity(scope, {});
    expect(result.staff[0].alerts).toHaveLength(1);
    expect(result.staff[0].alerts[0].type).toBe('EXCESSIVE_STAMPS_SAME_CUSTOMER');
    expect(result.staff[0].alerts[0].description).toBe(
      'Cajero Alto entregó 4 o más sellos al mismo cliente en menos de 7 días. Verifica si corresponde a compras reales.',
    );
  });
});