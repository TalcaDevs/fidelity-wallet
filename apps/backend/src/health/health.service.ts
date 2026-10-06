import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: 'connected' | 'disconnected';
  version: string;
  error?: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckResult> {
    const uptime = Math.floor(process.uptime());
    const timestamp = new Date().toISOString();
    const version = process.env.npm_package_version ?? '0.0.1';

    try {
      // Verificación de conectividad con la base de datos con timeout de 3 segundos
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database ping timeout')), 3000),
        ),
      ]);

      return {
        status: 'ok',
        timestamp,
        uptime,
        database: 'connected',
        version,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown database error';
      this.logger.error(`Health check probe falló: ${errorMessage}`);
      return {
        status: 'error',
        timestamp,
        uptime,
        database: 'disconnected',
        error: errorMessage,
        version,
      };
    }
  }
}
