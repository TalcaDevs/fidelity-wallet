import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PassesService } from '../passes/passes.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import {
  LocationsService,
  availableSlug,
  locationChanges,
} from './locations.service.js';

const merchant = (overrides: object = {}) => ({
  id: 'm-1',
  brandId: 'b-1',
  name: 'Centro',
  slug: 'centro',
  email: null,
  address: null,
  commune: null,
  region: null,
  latitude: null,
  longitude: null,
  phone: null,
  contactName: null,
  isActive: true,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  ...overrides,
});

describe('LocationsService', () => {
  let prisma: any;
  let passes: { refreshNearbyLocations: ReturnType<typeof vi.fn> };
  let service: LocationsService;

  beforeEach(() => {
    prisma = {
      brandMember: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ role: 'OWNER', merchantId: null }),
      },
      brand: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ status: 'ACTIVE', planId: 'BUSINESS' }),
      },
      merchant: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue({ id: 'm-1', isActive: true }),
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn(({ data }: any) => Promise.resolve(merchant(data))),
        update: vi.fn(({ data }: any) => Promise.resolve(merchant(data))),
      },
      $queryRaw: vi.fn().mockResolvedValue([]),
      $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    passes = { refreshNearbyLocations: vi.fn().mockResolvedValue(undefined) };
    service = new LocationsService(prisma as PrismaService, passes as unknown as PassesService);
  });

  describe('aviso al pasar cerca (Google Wallet)', () => {
    it('republishes the card when a location moves or stops operating', async () => {
      await service.update('b-1', 'owner', 'm-1', { latitude: -33.17, longitude: -70.67 });
      await service.update('b-1', 'owner', 'm-1', { isActive: false });
      expect(passes.refreshNearbyLocations).toHaveBeenCalledTimes(2);
      expect(passes.refreshNearbyLocations).toHaveBeenCalledWith('b-1');
    });

    it('does not republish for changes Google does not use', async () => {
      await service.update('b-1', 'owner', 'm-1', { name: 'Centro 2', phone: '+56912345678' });
      expect(passes.refreshNearbyLocations).not.toHaveBeenCalled();
    });

    it('republishes when a new location already has coordinates', async () => {
      await service.create('b-1', 'owner', { name: 'Sin mapa' });
      expect(passes.refreshNearbyLocations).not.toHaveBeenCalled();
      await service.create('b-1', 'owner', { name: 'Con mapa', latitude: -33.4, longitude: -70.6 });
      expect(passes.refreshNearbyLocations).toHaveBeenCalledWith('b-1');
    });
  });

  it('is only for the OWNER of an active brand', async () => {
    prisma.brandMember.findUnique.mockResolvedValueOnce({
      role: 'STAFF',
      merchantId: 'm-1',
    });
    await expect(service.list('b-1', 'staff')).rejects.toThrow(
      ForbiddenException,
    );

    prisma.brand.findUnique.mockResolvedValueOnce({ status: 'SUSPENDED' });
    await expect(service.list('b-1', 'owner')).rejects.toThrow(
      'Tu cuenta está suspendida',
    );
  });

  it('creates the location in the caller brand with a slug from its name', async () => {
    const dto = await service.create('b-1', 'owner', {
      name: 'Café Ñuñoa',
      region: 'Metropolitana',
    });

    expect(prisma.merchant.create.mock.calls[0][0].data).toMatchObject({
      brandId: 'b-1',
      name: 'Café Ñuñoa',
      slug: 'cafe-nunoa',
      region: 'Metropolitana',
    });
    expect(dto.slug).toBe('cafe-nunoa');
  });

  it('only edits locations of the caller brand', async () => {
    prisma.merchant.findFirst.mockResolvedValue(null);
    await expect(
      service.update('b-1', 'owner', 'm-ajeno', { name: 'X' }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.merchant.findFirst).toHaveBeenCalledWith({
      where: { id: 'm-ajeno', brandId: 'b-1' },
      select: { id: true, isActive: true },
    });
  });

  it('sends only the fields that came, and null clears a value', () => {
    expect(
      locationChanges({ phone: null, isActive: false, name: undefined }),
    ).toEqual({ phone: null, isActive: false });
  });
});

describe('availableSlug', () => {
  const dbWith = (slugs: string[]) =>
    ({
      merchant: {
        findMany: vi.fn().mockResolvedValue(slugs.map((slug) => ({ slug }))),
      },
    }) as any;

  it('adds a numeric suffix when the slug is taken', async () => {
    expect(await availableSlug(dbWith([]), 'Café Centro')).toBe('cafe-centro');
    expect(
      await availableSlug(
        dbWith(['cafe-centro', 'cafe-centro-2']),
        'Café Centro',
      ),
    ).toBe('cafe-centro-3');
  });

  it('falls back to a neutral slug when the name has nothing usable', async () => {
    expect(await availableSlug(dbWith([]), '!!')).toMatch(
      /^local-[0-9a-f]{12}$/,
    );
  });
});
