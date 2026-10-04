import type { CardConfig, CardConfigDto, CardImageKind, CardImageUploadDto } from '@fidelity/shared';
import { jsonBody, requestJson } from './httpJson';

export function getCard(brandId: string): Promise<CardConfigDto> {
  return requestJson(`/api/brands/${brandId}/card`, undefined, 'No pudimos cargar tu tarjeta');
}

/** Guarda todo de una vez; el backend publica el diseño en los pases ya emitidos. */
export function saveCard(brandId: string, config: CardConfig): Promise<CardConfigDto> {
  return requestJson(
    `/api/brands/${brandId}/card`,
    { method: 'PUT', ...jsonBody(config) },
    'No pudimos guardar la tarjeta',
  );
}

export function uploadCardImage(brandId: string, kind: CardImageKind, file: File): Promise<CardImageUploadDto> {
  const form = new FormData();
  form.append('kind', kind);
  form.append('image', file);
  return requestJson(
    `/api/brands/${brandId}/card/images`,
    { method: 'POST', body: form },
    'No pudimos subir la imagen',
  );
}
