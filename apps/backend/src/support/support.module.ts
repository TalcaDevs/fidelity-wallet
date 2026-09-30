import { Module } from '@nestjs/common';
import { PlatformAdminGuard } from '../common/guards/platform-admin.guard.js';
import { InternalTicketsController } from './internal-tickets.controller.js';
import { InternalTicketsService } from './internal-tickets.service.js';
import { SupportStorageService } from './support-storage.service.js';
import { SupportController } from './support.controller.js';
import { SupportService } from './support.service.js';
import { TicketAutoCloseService } from './ticket-autoclose.service.js';
import { TicketPresenterService } from './ticket-presenter.service.js';
import { UserDirectoryService } from '../common/users/user-directory.service.js';

@Module({
  controllers: [SupportController, InternalTicketsController],
  providers: [
    SupportService,
    InternalTicketsService,
    SupportStorageService,
    TicketPresenterService,
    TicketAutoCloseService,
    UserDirectoryService,
    PlatformAdminGuard,
  ],
})
export class SupportModule {}
