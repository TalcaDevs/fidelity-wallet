import { Module } from '@nestjs/common';
import { PassesModule } from '../passes/passes.module.js';
import { ScanController } from './scan.controller.js';
import { ScanService } from './scan.service.js';

@Module({
  imports: [PassesModule],
  controllers: [ScanController],
  providers: [ScanService],
  exports: [ScanService],
})
export class ScanModule {}
