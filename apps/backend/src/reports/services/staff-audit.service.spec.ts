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
    expect(result.staff[0].staffEmail).toBe('high@test.cl');
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
      'high@test.cl (Cajero Alto) entregó 4 o más sellos al mismo cliente en menos de 7 días. Verifica si corresponde a compras reales.',
    );
  });

  it('calcula porcentaje manual por conteo de operaciones y activa HIGH_MANUAL_SCAN_RATIO en cargas múltiples', async () => {
    (prisma.brandMember.findMany as any).mockResolvedValue([
      { userId: 'user-high', role: 'STAFF' },
    ]);
    // 20 operaciones MANUAL de 2 sellos cada una = 40 sellos en 20 operaciones (100% manual)
    const twentyManualScans = Array.from({ length: 20 }, (_, i) => ({
      id: `s-${i + 1}`,
      type: 'STAMP_ADDED',
      method: 'MANUAL',
      passId: `p-${i + 1}`,
      createdByUserId: 'user-high',
      createdAt: new Date(Date.now() + i * 1000),
      stampCount: 2,
    }));
    (prisma.scan.findMany as any).mockResolvedValue(twentyManualScans);

    const result = await service.getStaffActivity(scope, {});
    const staff = result.staff[0];

    expect(staff.stampsCount).toBe(40);
    expect(staff.manualPercentage).toBe(100);
    expect(staff.alerts.some((a) => a.type === 'HIGH_MANUAL_SCAN_RATIO')).toBe(true);
  });

  it('maneja cargas de solo puntos (stampCount: 0) sin distorsionar el total de operaciones', async () => {
    (prisma.brandMember.findMany as any).mockResolvedValue([
      { userId: 'user-high', role: 'STAFF' },
    ]);
    // 10 manuales + 10 QR con stampCount: 0 (puntos) = 20 operaciones, 50% manual
    const pointScans = Array.from({ length: 20 }, (_, i) => ({
      id: `sp-${i + 1}`,
      type: 'STAMP_ADDED',
      method: i < 10 ? 'MANUAL' : 'QR',
      passId: `p-${i + 1}`,
      createdByUserId: 'user-high',
      createdAt: new Date(Date.now() + i * 1000),
      stampCount: 0,
    }));
    (prisma.scan.findMany as any).mockResolvedValue(pointScans);

    const result = await service.getStaffActivity(scope, {});
    const staff = result.staff[0];

    expect(staff.stampsCount).toBe(0);
    expect(staff.manualPercentage).toBe(50);
  });
});