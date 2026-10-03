import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import {
  TICKET_ATTACHMENT_MAX_BYTES,
  type TicketAttachmentMimeType,
} from '@fidelity/shared';
import sharp from 'sharp';

export interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ValidatedImage {
  fileName: string;
  mimeType: TicketAttachmentMimeType;
  extension: 'png' | 'jpg';
  sizeBytes: number;
  buffer: Buffer;
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

/** Una captura de pantalla 4K cabe de sobra; más que esto huele a bomba de descompresión. */
export const MAX_IMAGE_PIXELS = 40_000_000;
export const MAX_IMAGE_SIDE = 10_000;

const CORRUPT = 'La captura está dañada o no es una imagen válida';

function detectType(buffer: Buffer) {
  if (buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return { mimeType: 'image/png', extension: 'png' } as const;
  }
  if (buffer.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)) {
    return { mimeType: 'image/jpeg', extension: 'jpg' } as const;
  }
  return null;
}

/**
 * El tipo se decide por los bytes (la extensión y el Content-Type los elige el cliente) y la
 * imagen se decodifica y se vuelve a codificar entera. Así:
 * - un archivo corrupto, truncado o que solo imita la cabecera no pasa;
 * - lo que viniera escondido detrás de la imagen (políglotas, scripts) se descarta;
 * - se borran los metadatos (EXIF, GPS, modelo del teléfono);
 * - una imagen con dimensiones absurdas se rechaza antes de reservar memoria para ella.
 */
export async function sanitizeImage(
  file: UploadedImage,
): Promise<ValidatedImage> {
  if (
    file.size > TICKET_ATTACHMENT_MAX_BYTES ||
    file.buffer.length > TICKET_ATTACHMENT_MAX_BYTES
  ) {
    throw new BadRequestException('La captura no puede superar los 10 MB');
  }

  const kind = detectType(file.buffer);
  if (!kind) {
    throw new BadRequestException('La captura debe ser una imagen PNG o JPG');
  }

  let buffer: Buffer;
  try {
    const image = sharp(file.buffer, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: 'error',
    });
    const meta = await image.metadata();
    const expected = kind.extension === 'png' ? 'png' : 'jpeg';
    if (meta.format !== expected || !meta.width || !meta.height)
      throw new Error('formato inconsistente');
    if (meta.width > MAX_IMAGE_SIDE || meta.height > MAX_IMAGE_SIDE)
      throw new Error('dimensiones');

    // rotate() sin argumentos aplica la orientación EXIF antes de que se pierda con los metadatos.
    const pipeline = image.rotate();
    buffer = await (
      kind.extension === 'png'
        ? pipeline.png({ compressionLevel: 9 })
        : pipeline.jpeg({ quality: 85 })
    ).toBuffer();
  } catch {
    throw new BadRequestException(CORRUPT);
  }

  if (buffer.length > TICKET_ATTACHMENT_MAX_BYTES) {
    throw new BadRequestException('La captura no puede superar los 10 MB');
  }

  return {
    ...kind,
    fileName: sanitizeFileName(file.originalname, kind.extension),
    sizeBytes: buffer.length,
    buffer,
  };
}

function sanitizeFileName(name: string, extension: string): string {
  const base = (name || 'captura')
    .replace(/\.[^.]*$/, '')
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'captura'}.${extension}`;
}

export function attachmentPath(
  brandId: string,
  ticketId: string,
  image: ValidatedImage,
): string {
  return `${brandId}/${ticketId}/${randomUUID()}.${image.extension}`;
}
