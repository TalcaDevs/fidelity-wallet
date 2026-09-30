import { Module } from '@nestjs/common';
import { GeocodingService } from './geocoding.service.js';
import { LocationsController } from './locations.controller.js';
import { LocationsService } from './locations.service.js';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService, GeocodingService],
})
export class LocationsModule {}
