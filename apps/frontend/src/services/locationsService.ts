import type { GeocodeResultDto, LocationDto, LocationInput, LocationUpdateInput } from '@fidelity/shared';
import { supabase } from '../lib/supabase';
import { jsonBody, requestJson } from './httpJson';

export interface LocationOption {
  id: string;
  name: string;
  isActive: boolean;
}

/** Locales de la marca; el RLS ya limita la lectura a los miembros. */
export async function listBrandLocations(brandId: string): Promise<LocationOption[]> {
  const { data, error } = await supabase
    .from('Merchant')
    .select('id, name, isActive')
    .eq('brandId', brandId)
    .order('createdAt', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LocationOption[];
}

// Sucursales con todos sus datos (HANDOFF §11.3): lectura y escritura por el backend.
const base = (brandId: string) => `/api/brands/${brandId}/locations`;

export function listLocations(brandId: string): Promise<LocationDto[]> {
  return requestJson(base(brandId), undefined, 'No se pudieron cargar tus sucursales');
}

export function createLocation(brandId: string, input: LocationInput): Promise<LocationDto> {
  return requestJson(base(brandId), { method: 'POST', ...jsonBody(input) }, 'No se pudo crear la sucursal');
}

export function updateLocation(brandId: string, locationId: string, input: LocationUpdateInput): Promise<LocationDto> {
  return requestJson(`${base(brandId)}/${locationId}`, { method: 'PATCH', ...jsonBody(input) }, 'No se pudo guardar la sucursal');
}

export function geocode(q: string): Promise<GeocodeResultDto[]> {
  return requestJson(`/api/geocode?q=${encodeURIComponent(q)}`, undefined, 'No se pudo buscar la dirección');
}
