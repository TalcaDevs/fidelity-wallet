// Sucursales de una marca (HANDOFF §11.3). En la BD un local es la tabla Merchant.

export const CHILE_REGIONS = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes',
] as const;

export interface LocationDto {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  address: string | null;
  commune: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  contactName: string | null;
  isActive: boolean;
  createdAt: string;
}

/** Campos editables de un local. El slug se cambia por su propio endpoint (invalida QR impresos). */
export interface LocationInput {
  name: string;
  address?: string | null;
  commune?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  contactName?: string | null;
}

export interface LocationUpdateInput extends Partial<LocationInput> {
  isActive?: boolean;
}

export interface GeocodeResultDto {
  label: string;
  latitude: number;
  longitude: number;
  address: string | null;
  commune: string | null;
  region: string | null;
}
