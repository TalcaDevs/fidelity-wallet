import { Module } from '@nestjs/common';
import { UserDirectoryService } from '../common/users/user-directory.service.js';
import { PassesModule } from '../passes/passes.module.js';
import { ScanModule } from '../scan/scan.module.js';
import { CustomerHistoryService } from './customer-history.service.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';

@Module({
  imports: [PassesModule, ScanModule],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerHistoryService, UserDirectoryService],
  exports: [CustomersService, CustomerHistoryService],
})
export class CustomersModule {}
