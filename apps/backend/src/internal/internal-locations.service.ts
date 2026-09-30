import { Injectable, NotFoundException } from '@nestjs/common';
import type { InternalLocationPinDto, LocationDto } from '@fidelity/shared';
import type { Prisma } from '@prisma/client';
import { diffFields, recordAudit } from '../common/audit/audit.js';
import type { UpdateLocationDto } from '../locations/dto/location.dto.js';
import { toLocationDto } from '../locations/location-mapper.js';
import { locationChanges } from '../locations/locations.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListLocationPinsQueryDto } from './dto/internal.dto.js';

/** Locales de todas las marcas para /internal: edición auditada y pines del mapa. */
@Injectable()
export class InternalLocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async update(
    locationId: string,
    actorUserId: string,
    dto: UpdateLocationDto,
  ): Promise<LocationDto> {
    const current = await this.prisma.merchant.findUnique({
      where: { id: locationId },
    });
    if (!current) throw new NotFoundException('El local no existe');

    const changes = locationChanges(dto);
    const diff = diffFields(current, changes as Partial<typeof current>);
    if (!diff) return toLocationDto(current);

    const [updated] = await this.prisma.$transaction([
      this.prisma.merchant.update({ where: { id: locationId }, data: changes }),
      recordAudit(this.prisma, {
        actorUserId,
        actorType: 'PLATFORM',
        action: 'location.update',
        entity: 'Merchant',
        entityId: locationId,
        before: diff.before as Prisma.InputJsonObject,
        after: diff.after as Prisma.InputJsonObject,
      }),
    ]);
    return toLocationDto(updated);
  }

  /** Solo locales con coordenadas: los demás no se pueden dibujar. */
  async pins(
    query: ListLocationPinsQueryDto,
  ): Promise<InternalLocationPinDto[]> {
    const locations = await this.prisma.merchant.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        ...(query.brandId ? { brandId: query.brandId } : {}),
        ...(query.region ? { region: query.region } : {}),
      },
      select: {
        id: true,
        brandId: true,
        name: true,
        commune: true,
        region: true,
        latitude: true,
        longitude: true,
        isActive: true,
        brand: { select: { name: true, status: true } },
      },
      take: 2000,
    });

    return locations.map((l) => ({
      id: l.id,
      brandId: l.brandId,
      brandName: l.brand.name,
      brandStatus: l.brand.status,
      name: l.name,
      commune: l.commune,
      region: l.region,
      latitude: l.latitude as number,
      longitude: l.longitude as number,
      isActive: l.isActive,
    }));
  }
}
