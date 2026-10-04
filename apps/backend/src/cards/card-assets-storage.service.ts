import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CARD_IMAGE_MAX_BYTES } from '@fidelity/shared';
import { PublicBucketStorage } from '../common/storage/bucket-storage.js';
import { internalStorageUrl, publicStorageUrl } from '../common/storage/storage-url.js';

export const CARD_ASSETS_BUCKET = 'card-assets';

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
    return publicStorageUrl(url, this.configService).startsWith(this.publicPrefix(brandId));
  }

  /** Ruta dentro del bucket a partir de la URL pública; null si no es de este bucket. */
  pathOf(url: string): string | null {
    const prefix = this.publicPrefix('').replace(/\/$/, '');
    const publicUrl = publicStorageUrl(url, this.configService);
    return publicUrl.startsWith(`${prefix}/`) ? publicUrl.slice(prefix.length + 1) : null;
  }

  /** Para que el backend descargue una imagen propia sin pasar por el origen público. */
  downloadUrl(url: string): string {
    return internalStorageUrl(url, this.configService);
  }
}
