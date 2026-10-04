import { RECEIPT_MAX_BYTES, RECEIPT_MIME_TYPES } from '@fidelity/shared';
import { compressImage } from './compressImage';

export type ReceiptResult = { file: File; problem: null } | { file: null; problem: string };

/** Valida el tipo, achica la foto y valida el tamaño ya comprimido. */
export async function prepareReceiptPhoto(file: File): Promise<ReceiptResult> {
  if (!(RECEIPT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { file: null, problem: 'La foto de la boleta debe ser una imagen JPG o PNG' };
  }
  const compressed = await compressImage(file);
  if (compressed.size > RECEIPT_MAX_BYTES) {
    return { file: null, problem: 'La foto de la boleta no puede superar los 10 MB' };
  }
  return { file: compressed, problem: null };
}
