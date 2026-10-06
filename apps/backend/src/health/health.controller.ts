import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { HealthService } from './health.service.js';

@ApiTags('Health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Verifica el estado del servicio y conectividad con la base de datos',
    description:
      'Endpoint ligero para sondas de Render, Kubernetes, UptimeRobot o BetterStack. Retorna 200 si todo está saludable o 503 si la base de datos no responde.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Servicio y base de datos saludables',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-10-06T01:05:00.000Z',
        uptime: 124,
        database: 'connected',
        version: '0.0.1',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'El servicio está degradado o la base de datos no responde',
    schema: {
      example: {
        status: 'error',
        timestamp: '2026-10-06T01:05:00.000Z',
        uptime: 124,
        database: 'disconnected',
        error: 'Database ping timeout',
        version: '0.0.1',
      },
    },
  })
  async check(@Res({ passthrough: true }) res: Response) {
    const result = await this.healthService.check();
    if (result.status !== 'ok') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return result;
  }
}
