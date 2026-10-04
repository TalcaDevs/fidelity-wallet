import { BadRequestException } from '@nestjs/common';
import { CARD_IMAGE_MAX_BYTES, CARD_IMAGE_SPECS, type CardImageKind } from '@fidelity/shared';
import sharp from 'sharp';
import { MAX_IMAGE_PIXELS, MAX_IMAGE_SIDE, type UploadedImage } from '../common/storage/image.js';

export interface CardImage {
  buffer: Buffer;
  mimeType: 'image/png' | 'image/jpeg';
  extension: 'png' | 'jpg';
}

const ACCEPTED_FORMATS = new Set(['png', 'jpeg', 'webp']);

/**
 * Decodifica y vuelve a codificar la imagen (descarta metadatos y lo que venga escondido) al
 * tamaño que usa Google Wallet para ese espacio. WebP entra pero sale PNG o JPG: Google no lo acepta.
 */
export async function prepareCardImage(file: UploadedImage, kind: CardImageKind): Promise<CardImage> {
  if (file.size > CARD_IMAGE_MAX_BYTES || file.buffer.length > CARD_IMAGE_MAX_BYTES) {
    throw new BadRequestException('La imagen no puede superar los 5 MB');
  }
  const spec = CARD_IMAGE_SPECS[kind];
  try {
    const image = sharp(file.buffer, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'error' });
    const meta = await image.metadata();
    if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) throw new Error('formato');
    if (!meta.width || !meta.height || meta.width > MAX_IMAGE_SIDE || meta.height > MAX_IMAGE_SIDE) {
      throw new Error('dimensiones');
    }

    const resized = image.rotate().resize(spec.width, spec.height, {
      fit: spec.fit,
      withoutEnlargement: spec.fit === 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
    if (spec.format === 'jpg') {
      return {
        buffer: await resized.flatten({ background: '#ffffff' }).jpeg({ quality: 85 }).toBuffer(),
        mimeType: 'image/jpeg',
        extension: 'jpg',
      };
    }
    return {
      buffer: await resized.png({ compressionLevel: 9 }).toBuffer(),
      mimeType: 'image/png',
      extension: 'png',
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'formato') {
      throw new BadRequestException('La imagen debe ser PNG, JPG o WebP');
    }
    throw new BadRequestException('La imagen está dañada o no es válida');
  }
}
