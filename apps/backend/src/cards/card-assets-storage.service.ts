import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CARD_IMAGE_MAX_BYTES } from '@fidelity/shared';
import { PublicBucketStorage } from '../common/storage/bucket-storage.js';

export const CARD_ASSETS_BUCKET = 'card-assets';
const PUBLIC_ASSETS_PATH = `/storage/v1/object/public/${CARD_ASSETS_BUCKET}/`;

/** Logos, imagen destacada y sellos de la tarjeta. Públicos: Google Wallet los descarga. */
@Injectable()
export class CardAssetsStorageService extends PublicBucketStorage {
  constructor(configService: ConfigService) {
    super(configService, {
      bucket: CARD_ASSETS_BUCKET,
      fileSizeLimit: CARD_IMAGE_MAX_BYTES,
      allowedMimeTypes: ['image/png', 'image/jpeg'],
      uploadErrorMessage: 'No se pudo guardar la imagen',
    });
  }

  /** Una URL de imagen solo vale si es de la carpeta de la marca en este bucket. */
  belongsToBrand(url: string, brandId: string): boolean {
    const path = this.pathOf(url);
    return path !== null && path.split('/')[0] === brandId;
  }

  /** Ruta dentro del bucket a partir de la URL pública; null si no es de este bucket. */
  pathOf(url: string): string | null {
    // Comprobar la ruta original: URL normaliza los segmentos ".." antes de exponer pathname.
    const raw = /^https?:\/\/([^/?#]+)(\/[^?#]*)$/i.exec(url);
    if (!raw || /[\s\\]/.test(url) || /[@%]/.test(raw[1]!)) return null;

    try {
      const segments = raw[2]!.slice(1).split('/').map(decodeURIComponent);
      if (
        segments.some(
          (segment) =>
            !/^[a-zA-Z0-9._-]+$/.test(segment) ||
            segment === '.' ||
            segment === '..',
        )
      )
        return null;

      const parsed = new URL(url);
      const pathname = `/${segments.join('/')}`;
      for (const setting of ['SUPABASE_URL', 'SUPABASE_PUBLIC_URL'] as const) {
        const base = this.storageBase(setting);
        if (!base || parsed.origin !== base.origin) continue;
        const prefix = `${base.pathname.replace(/\/+$/, '')}${PUBLIC_ASSETS_PATH}`;
        if (!pathname.startsWith(prefix)) continue;
        const path = pathname.slice(prefix.length);
        // Debe incluir tanto la carpeta de la marca como el nombre de archivo.
        if (path.split('/').length >= 2) return path;
      }
    } catch {
      // Incluye escapes porcentuales malformados y URLs que no se pueden interpretar.
    }
    return null;
  }

  /** Para que el backend descargue una imagen propia sin pasar por el origen público. */
  downloadUrl(url: string): string {
    const path = this.pathOf(url);
    const internal = this.storageBase('SUPABASE_URL');
    if (!path || !internal)
      throw new BadRequestException('URL de imagen no válida');
    return `${internal.origin}${internal.pathname.replace(/\/+$/, '')}${PUBLIC_ASSETS_PATH}${path}`;
  }

  private storageBase(
    setting: 'SUPABASE_URL' | 'SUPABASE_PUBLIC_URL',
  ): URL | null {
    const configured = this.configService.get<string>(setting);
    if (!configured) return null;
    try {
      const base = new URL(configured);
      if (
        !['http:', 'https:'].includes(base.protocol) ||
        base.username ||
        base.password ||
        base.search ||
        base.hash
      )
        return null;
      return base;
    } catch {
      return null;
    }
  }
}
