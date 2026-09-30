import type { LocationDto } from '@fidelity/shared';
import type { Merchant } from '@prisma/client';

export function toLocationDto(m: Merchant): LocationDto {
  return {
    id: m.id,
    brandId: m.brandId,
    name: m.name,
    slug: m.slug,
    address: m.address,
    commune: m.commune,
    region: m.region,
    latitude: m.latitude,
    longitude: m.longitude,
    phone: m.phone,
    contactName: m.contactName,
    isActive: m.isActive,
    createdAt: m.createdAt.toISOString(),
  };
}
