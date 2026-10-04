import type { ConfigService } from '@nestjs/config';

const trim = (url: string | undefined) => url?.replace(/\/+$/, '') || undefined;

function swapOrigin(url: string, from: string | undefined, to: string | undefined): string {
  return from && to && url.startsWith(`${from}/`) ? to + url.slice(from.length) : url;
}

/**
 * Las imágenes del Storage se guardan con la URL que tenía al subirse. SUPABASE_PUBLIC_URL (p. ej.
 * un túnel HTTPS en local) permite publicarlas aunque se hayan subido con la URL interna.
 */
export function publicStorageUrl(url: string, config: ConfigService): string {
  return swapOrigin(url, trim(config.get<string>('SUPABASE_URL')), trim(config.get<string>('SUPABASE_PUBLIC_URL')));
}

/** Lo contrario: el backend descarga sus propias imágenes por la URL interna, sin dar la vuelta. */
export function internalStorageUrl(url: string, config: ConfigService): string {
  return swapOrigin(url, trim(config.get<string>('SUPABASE_PUBLIC_URL')), trim(config.get<string>('SUPABASE_URL')));
}
