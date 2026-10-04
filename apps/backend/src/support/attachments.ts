import { randomUUID } from 'crypto';
import type { ValidatedImage } from '../common/storage/image.js';

export {
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_SIDE,
  sanitizeImage,
  type UploadedImage,
  type ValidatedImage,
} from '../common/storage/image.js';

export function attachmentPath(
  brandId: string,
  ticketId: string,
  image: ValidatedImage,
): string {
  return `${brandId}/${ticketId}/${randomUUID()}.${image.extension}`;
}
