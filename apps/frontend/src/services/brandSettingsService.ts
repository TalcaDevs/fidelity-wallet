import { jsonBody, requestJson } from './httpJson';

export interface BrandSettings {
  name: string;
  stampValidityDays: number | null;
  pointsEnabled: boolean;
  pesosPerPoint: number;
}

// Lo que es de la marca y no de un local. Se guarda en una sola transacción del backend.
export function getBrandSettings(brandId: string): Promise<BrandSettings> {
  return requestJson(`/api/brands/${brandId}/settings`, undefined, 'No pudimos cargar los datos de tu marca');
}

export function updateBrandSettings(brandId: string, settings: Partial<BrandSettings>): Promise<BrandSettings> {
  return requestJson(
    `/api/brands/${brandId}/settings`,
    { method: 'PATCH', ...jsonBody(settings) },
    'No pudimos guardar los cambios',
  );
}
