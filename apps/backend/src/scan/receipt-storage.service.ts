import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RECEIPT_MAX_BYTES, RECEIPT_MIME_TYPES } from '@fidelity/shared';
import { PrivateBucketStorage } from '../common/storage/private-bucket-storage.js';

export const RECEIPTS_BUCKET = 'purchase-receipts';

/** Fotos de boletas: solo las ven el OWNER y SUPERADMIN, con URL firmada. */
@Injectable()
export class ReceiptStorageService extends PrivateBucketStorage {
  constructor(configService: ConfigService) {
    super(configService, {
      bucket: RECEIPTS_BUCKET,
      fileSizeLimit: RECEIPT_MAX_BYTES,
      allowedMimeTypes: RECEIPT_MIME_TYPES,
      uploadErrorMessage: 'No se pudo guardar la foto de la boleta',
    });
  }
}
