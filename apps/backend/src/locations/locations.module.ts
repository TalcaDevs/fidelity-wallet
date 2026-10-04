import { Module } from '@nestjs/common';
import { PassesModule } from '../passes/passes.module.js';
import { GeocodingService } from './geocoding.service.js';
import { LocationsController } from './locations.controller.js';
import { LocationsService } from './locations.service.js';

@Module({
  imports: [PassesModule],
  controllers: [LocationsController],
  providers: [LocationsService, GeocodingService],
})
export class LocationsModule {}
