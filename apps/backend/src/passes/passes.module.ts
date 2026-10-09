import { Module } from '@nestjs/common';
import { PassesController } from './passes.controller.js';
import { PassesService } from './passes.service.js';
import { ApplePassService } from './services/apple-pass.service.js';
import { GoogleWalletService } from './services/google-wallet.service.js';
import { PassUpdateWorkerService } from './services/pass-update-worker.service.js';
import { PassDeactivationWorkerService } from './services/pass-deactivation-worker.service.js';

@Module({
  controllers: [PassesController],
  providers: [
    PassesService,
    ApplePassService,
    GoogleWalletService,
    PassUpdateWorkerService,
    PassDeactivationWorkerService,
  ],
  exports: [
    PassesService,
    ApplePassService,
    GoogleWalletService,
    PassUpdateWorkerService,
    PassDeactivationWorkerService,
  ],
})
export class PassesModule {}
