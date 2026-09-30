import { Injectable } from '@nestjs/common';
import type { InternalTicketDto, TicketDetailDto } from '@fidelity/shared';
import { SupportStorageService } from './support-storage.service.js';
import {
  attachmentPaths,
  referencedUserIds,
  toInternalTicket,
  toTicketDetail,
  type DetailContext,
  type TicketWithDetail,
  type Viewer,
} from './ticket-mapper.js';
import { UserDirectoryService } from '../common/users/user-directory.service.js';

@Injectable()
export class TicketPresenterService {
  constructor(
    private readonly storage: SupportStorageService,
    private readonly users: UserDirectoryService,
  ) {}

  async forMerchant(ticket: TicketWithDetail): Promise<TicketDetailDto> {
    return toTicketDetail(
      ticket,
      'MERCHANT',
      await this.context(ticket, 'MERCHANT'),
    );
  }

  async forPlatform(ticket: TicketWithDetail): Promise<InternalTicketDto> {
    return toInternalTicket(ticket, await this.context(ticket, 'PLATFORM'));
  }

  private async context(
    ticket: TicketWithDetail,
    viewer: Viewer,
  ): Promise<DetailContext> {
    const [urls, users] = await Promise.all([
      this.storage.signedUrls(attachmentPaths(ticket, viewer)),
      this.users.lookup(referencedUserIds(ticket)),
    ]);
    return { urls, users };
  }
}
