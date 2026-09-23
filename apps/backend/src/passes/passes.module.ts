import { Module } from '@nestjs/common';
import { PassesController } from './passes.controller.js';
import { PassesService } from './passes.service.js';
import { ApplePassService } from './services/apple-pass.service.js';
import { GoogleWalletService } from './services/google-wallet.service.js';

@Module({
  controllers: [PassesController],
  providers: [PassesService, ApplePassService, GoogleWalletService],
  exports: [PassesService, ApplePassService, GoogleWalletService],
})
export class PassesModule {}
