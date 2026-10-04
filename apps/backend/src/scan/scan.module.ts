import { Module } from '@nestjs/common';
import { PassesModule } from '../passes/passes.module.js';
import { ManualLookupLimiter } from './manual-lookup-limiter.js';
import { ReceiptStorageService } from './receipt-storage.service.js';
import { ScanController } from './scan.controller.js';
import { ScanService } from './scan.service.js';
import { ScanValidationTokens } from './validation-token.js';

@Module({
  imports: [PassesModule],
  controllers: [ScanController],
  providers: [
    ScanService,
    ReceiptStorageService,
    ScanValidationTokens,
    // useFactory: el constructor recibe números (límite y ventana) que Nest no sabe inyectar.
    { provide: ManualLookupLimiter, useFactory: () => new ManualLookupLimiter() },
  ],
  exports: [ScanService, ReceiptStorageService],
})
export class ScanModule {}
