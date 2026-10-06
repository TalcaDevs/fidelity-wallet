import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  let healthController: HealthController;
  let mockHealthService: {
    check: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockHealthService = {
      check: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    healthController = module.get<HealthController>(HealthController);
  });

  it('debe responder con estado OK cuando el servicio está saludable', async () => {
    const healthResult = {
      status: 'ok' as const,
      timestamp: '2026-10-06T01:00:00.000Z',
      uptime: 100,
      database: 'connected' as const,
      version: '0.0.1',
    };
    mockHealthService.check.mockResolvedValueOnce(healthResult);

    const mockResponse = {
      status: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const result = await healthController.check(mockResponse);

    expect(result).toEqual(healthResult);
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('debe responder con 503 SERVICE_UNAVAILABLE cuando la base de datos está desconectada', async () => {
    const healthResult = {
      status: 'error' as const,
      timestamp: '2026-10-06T01:00:00.000Z',
      uptime: 100,
      database: 'disconnected' as const,
      error: 'Database timeout',
      version: '0.0.1',
    };
    mockHealthService.check.mockResolvedValueOnce(healthResult);

    const mockResponse = {
      status: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const result = await healthController.check(mockResponse);

    expect(result).toEqual(healthResult);
    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });
});
