import { Module } from '@nestjs/common';
import {
  BrandSettingsController,
  BrandSettingsService,
} from './brand-settings.js';
import { MerchantsController } from './merchants.controller.js';
import { MerchantsService } from './merchants.service.js';

@Module({
  controllers: [MerchantsController, BrandSettingsController],
  providers: [MerchantsService, BrandSettingsService],
})
export class MerchantsModule {}
