import { Module } from '@nestjs/common';
import { PassesModule } from '../passes/passes.module.js';
import { ManualLookupLimiter } from './manual-lookup-limiter.js';
import { ScanController } from './scan.controller.js';
import { ScanService } from './scan.service.js';

@Module({
  imports: [PassesModule],
  controllers: [ScanController],
  providers: [
    ScanService,
    // useFactory: el constructor recibe números (límite y ventana) que Nest no sabe inyectar.
    { provide: ManualLookupLimiter, useFactory: () => new ManualLookupLimiter() },
  ],
  exports: [ScanService],
})
export class ScanModule {}
