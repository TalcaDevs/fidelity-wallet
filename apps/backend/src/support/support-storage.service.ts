import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TICKET_ATTACHMENT_MAX_BYTES,
  TICKET_ATTACHMENT_MIME_TYPES,
} from '@fidelity/shared';
import { PrivateBucketStorage } from '../common/storage/bucket-storage.js';

export const SUPPORT_BUCKET = 'support-attachments';

@Injectable()
export class SupportStorageService extends PrivateBucketStorage {
  constructor(configService: ConfigService) {
    super(configService, {
      bucket: SUPPORT_BUCKET,
      fileSizeLimit: TICKET_ATTACHMENT_MAX_BYTES,
      allowedMimeTypes: TICKET_ATTACHMENT_MIME_TYPES,
      uploadErrorMessage: 'No se pudo guardar la captura',
    });
  }
}
