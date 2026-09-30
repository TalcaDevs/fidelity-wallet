import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import {
  TICKET_ATTACHMENT_MAX_BYTES,
  type TicketAttachmentMimeType,
} from '@fidelity/shared';

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

/** El tipo se decide por los bytes del archivo: la extensión y el Content-Type los elige el cliente. */
export function validateImage(file: UploadedImage): ValidatedImage {
  if (
    file.size > TICKET_ATTACHMENT_MAX_BYTES ||
    file.buffer.length > TICKET_ATTACHMENT_MAX_BYTES
  ) {
    throw new BadRequestException('La captura no puede superar los 10 MB');
  }

  const head = file.buffer.subarray(0, PNG_SIGNATURE.length);
  const kind = head.equals(PNG_SIGNATURE)
    ? ({ mimeType: 'image/png', extension: 'png' } as const)
    : head.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)
      ? ({ mimeType: 'image/jpeg', extension: 'jpg' } as const)
      : null;

  if (!kind) {
    throw new BadRequestException('La captura debe ser una imagen PNG o JPG');
  }

  return {
    ...kind,
    fileName: sanitizeFileName(file.originalname, kind.extension),
    sizeBytes: file.buffer.length,
    buffer: file.buffer,
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
