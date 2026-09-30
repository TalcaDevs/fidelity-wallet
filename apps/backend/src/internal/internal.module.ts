import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module.js';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard.js';
import { UserDirectoryService } from '../common/users/user-directory.service.js';
import { AccessController } from './access.controller.js';
import { InternalBrandsService } from './internal-brands.service.js';
import { InternalController } from './internal.controller.js';
import { InternalCustomersService } from './internal-customers.service.js';

@Module({
  imports: [BillingModule],
  controllers: [InternalController, AccessController],
  providers: [
    InternalBrandsService,
    InternalCustomersService,
    UserDirectoryService,
    PlatformAdminGuard,
  ],
})
export class InternalModule {}
