import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternalTicketsService } from './internal-tickets.service.js';

/**
 * Corre closeStaleResolved cada SUPPORT_AUTOCLOSE_INTERVAL_MINUTES (60 por defecto; 0 lo apaga).
 * Es idempotente, así que no importa si hay varias instancias del backend.
 */
@Injectable()
export class TicketAutoCloseService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TicketAutoCloseService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly tickets: InternalTicketsService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const minutes = Number(
      this.config.get<string>('SUPPORT_AUTOCLOSE_INTERVAL_MINUTES') ?? 60,
    );
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    this.timer = setInterval(() => void this.run(), minutes * 60 * 1000);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async run(): Promise<void> {
    try {
      const closed = await this.tickets.closeStaleResolved();
      if (closed > 0)
        this.logger.log(`Tickets cerrados automáticamente: ${closed}`);
    } catch (err) {
      this.logger.error(
        `Falló el cierre automático de tickets: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
