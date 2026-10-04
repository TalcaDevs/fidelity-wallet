import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { PassesModule } from '../passes/passes.module.js';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard.js';
import { UserDirectoryService } from '../common/users/user-directory.service.js';
import { AccessController } from './access.controller.js';
import { InternalBrandsService } from './internal-brands.service.js';
import { InternalController } from './internal.controller.js';
import { InternalCustomersService } from './internal-customers.service.js';
import { InternalLocationsService } from './internal-locations.service.js';
import { InternalSummaryService } from './internal-summary.service.js';

@Module({
  imports: [BillingModule, CustomersModule, PassesModule],
  controllers: [InternalController, AccessController],
  providers: [
    InternalBrandsService,
    InternalCustomersService,
    InternalLocationsService,
    InternalSummaryService,
    UserDirectoryService,
    PlatformAdminGuard,
  ],
})
export class InternalModule {}
