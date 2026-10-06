import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  let healthService: HealthService;
  let mockPrisma: {
    $queryRaw: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockPrisma = {
      $queryRaw: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    healthService = module.get<HealthService>(HealthService);
  });

  it('debe retornar status ok y database connected cuando la base de datos responde', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    const result = await healthService.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(result.error).toBeUndefined();
    expect(typeof result.uptime).toBe('number');
    expect(typeof result.timestamp).toBe('string');
    expect(result.version).toBeDefined();
    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
  });

  it('debe retornar status error y database disconnected cuando la base de datos falla', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));

    const result = await healthService.check();

    expect(result.status).toBe('error');
    expect(result.database).toBe('disconnected');
    expect(result.error).toBe('Connection refused');
    expect(typeof result.uptime).toBe('number');
    expect(typeof result.timestamp).toBe('string');
  });
});
