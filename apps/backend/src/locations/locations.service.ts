import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { LocationDto } from '@fidelity/shared';
import { Prisma } from '@prisma/client';
import {
  requireActiveBrandOwner,
  type Db,
} from '../common/access/brand-access.js';
import { assertPlanAllows } from '../common/plan/plan-limits.js';
import { isValidSlug, slugify } from '../common/utils/slug.util.js';
import { PassesService } from '../passes/passes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateLocationDto,
  UpdateLocationDto,
} from './dto/location.dto.js';
import { toLocationDto } from './location-mapper.js';

const EDITABLE_FIELDS = [
  'name',
  'address',
  'commune',
  'region',
  'latitude',
  'longitude',
  'phone',
  'contactName',
  'isActive',
] as const;

/** Solo los campos que llegaron: `undefined` no toca la columna, `null` la borra. */
export function locationChanges(
  dto: UpdateLocationDto,
): Prisma.MerchantUpdateInput {
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (dto[field] !== undefined) data[field] = dto[field];
  }
  return data;
}

/** Slug legible a partir del nombre y, si ya está tomado, con sufijo numérico. */
export async function availableSlug(db: Db, name: string): Promise<string> {
  const base = slugify(name);
  if (!isValidSlug(base))
    return `local-${randomUUID().replace(/-/g, '').slice(0, 12)}`;

  const taken = new Set(
    (
      await db.merchant.findMany({
        where: { slug: { startsWith: base } },
        select: { slug: true },
      })
    ).map((m) => m.slug),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base.slice(0, 56)}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base.slice(0, 47)}-${randomUUID().slice(0, 12)}`;
}

/** La ubicación y si opera: lo que va en el aviso de Google Wallet al pasar cerca del local. */
export function changesNearbyLocations(dto: UpdateLocationDto): boolean {
  return dto.latitude !== undefined || dto.longitude !== undefined || dto.isActive !== undefined;
}

/** Sucursales de la marca desde el panel del dueño: /api/brands/:brandId/locations. */
@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passes: PassesService,
  ) {}

  async list(brandId: string, userId: string): Promise<LocationDto[]> {
    await requireActiveBrandOwner(this.prisma, userId, brandId);
    const locations = await this.prisma.merchant.findMany({
      where: { brandId },
      orderBy: { createdAt: 'asc' },
    });
    return locations.map(toLocationDto);
  }

  async create(
    brandId: string,
    userId: string,
    dto: CreateLocationDto,
  ): Promise<LocationDto> {
    await requireActiveBrandOwner(this.prisma, userId, brandId);
    // Límite y alta en la misma transacción: el lock de la marca serializa altas simultáneas.
    const create = () =>
      this.prisma.$transaction(async (tx) => {
        await assertPlanAllows(tx, brandId, 'locations');
        return tx.merchant.create({
          data: {
            ...(locationChanges(dto) as Prisma.MerchantUncheckedCreateInput),
            brandId,
            name: dto.name,
            slug: await availableSlug(tx, dto.name),
          },
        });
      });

    let created;
    try {
      created = await create();
    } catch (err) {
      // Dos altas simultáneas con el mismo nombre: la segunda recalcula el slug.
      if (
        !(err instanceof Prisma.PrismaClientKnownRequestError) ||
        err.code !== 'P2002'
      ) {
        throw err;
      }
      created = await create();
    }
    if (created.latitude !== null) void this.passes.refreshNearbyLocations(brandId);
    return toLocationDto(created);
  }

  async update(
    brandId: string,
    userId: string,
    locationId: string,
    dto: UpdateLocationDto,
  ): Promise<LocationDto> {
    await requireActiveBrandOwner(this.prisma, userId, brandId);
    const existing = await this.prisma.merchant.findFirst({
      where: { id: locationId, brandId },
      select: { id: true, isActive: true },
    });
    if (!existing)
      throw new NotFoundException('El local no existe en tu marca');
    const reactivating = dto.isActive === true && !existing.isActive;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (reactivating) await assertPlanAllows(tx, brandId, 'locations');
      return tx.merchant.update({
        where: { id: locationId },
        data: locationChanges(dto),
      });
    });
    if (changesNearbyLocations(dto)) void this.passes.refreshNearbyLocations(brandId);
    return toLocationDto(updated);
  }
}
