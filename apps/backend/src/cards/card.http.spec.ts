import 'reflect-metadata';
import { ValidationPipe, type ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DEFAULT_CARD_DESIGN, DEFAULT_CARD_DETAILS, DEFAULT_REGISTRATION } from '@fidelity/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard.js';
import { CardController } from './card.controller.js';
import { SaveCardDto } from './card.dto.js';
import { CardService } from './card.service.js';

const brandId = 'a0000000-0000-4000-8000-000000000001';
const userId = 'b0000000-0000-4000-8000-000000000001';
const url = `/api/brands/${brandId}/card`;

const body = (stampsEnabled: boolean, pointsEnabled: boolean) => ({
  type: stampsEnabled ? 'STAMPS' : 'POINTS',
  stampsEnabled,
  pointsEnabled,
  name: 'Tarjeta de prueba',
  rewards: [{ name: 'Premio', target: 5, currency: stampsEnabled ? 'STAMPS' : 'POINTS' }],
  welcomeBalance: 0,
  welcomeStamps: 0,
  welcomePoints: 0,
  dailyStampLimit: true,
  stampValidityDays: null,
  validity: { type: 'UNLIMITED', expiresAt: null, days: null },
  registration: DEFAULT_REGISTRATION,
  design: DEFAULT_CARD_DESIGN,
  details: DEFAULT_CARD_DETAILS,
});

// Vitest transforma TypeScript sin emitDecoratorMetadata. Se repone exclusivamente
// la metadata de tipos que tsc emite en producción; controller, DTO y validación
// permanecen reales. Esto permite ejercitar la ruta HTTP con el mismo ValidationPipe.
const constructorMetadata = Reflect.getOwnMetadata('design:paramtypes', CardController);
const saveMetadata = Reflect.getOwnMetadata('design:paramtypes', CardController.prototype, 'save');
const modalityMetadata = ['stampsEnabled', 'pointsEnabled'].map((key) => ({
  key,
  type: Reflect.getOwnMetadata('design:type', SaveCardDto.prototype, key),
}));

beforeAll(() => {
  if (!constructorMetadata) Reflect.defineMetadata('design:paramtypes', [CardService], CardController);
  if (!saveMetadata) Reflect.defineMetadata('design:paramtypes', [String, SaveCardDto, Object], CardController.prototype, 'save');
  for (const { key, type } of modalityMetadata) {
    if (!type) Reflect.defineMetadata('design:type', Boolean, SaveCardDto.prototype, key);
  }
});

afterAll(() => {
  if (!constructorMetadata) Reflect.deleteMetadata('design:paramtypes', CardController);
  if (!saveMetadata) Reflect.deleteMetadata('design:paramtypes', CardController.prototype, 'save');
  for (const { key, type } of modalityMetadata) {
    if (!type) Reflect.deleteMetadata('design:type', SaveCardDto.prototype, key);
  }
});

async function withApp(check: (server: Parameters<typeof request>[0], save: ReturnType<typeof vi.fn>) => Promise<void>) {
  const save = vi.fn(async (_brandId: string, _userId: string, dto: SaveCardDto) => ({
    brandId,
    stampsEnabled: dto.stampsEnabled,
    pointsEnabled: dto.pointsEnabled,
  }));
  const module = await Test.createTestingModule({
    controllers: [CardController],
    providers: [{ provide: CardService, useValue: { save } }],
  })
    .overrideGuard(SupabaseAuthGuard)
    .useValue({
      canActivate(context: ExecutionContext) {
        context.switchToHttp().getRequest<{ user: { id: string } }>().user = { id: userId };
        return true;
      },
    })
    .compile();
  const app = module.createNestApplication();
  try {
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));
    await app.init();
    await check(app.getHttpServer(), save);
  } finally {
    await app.close();
  }
}

describe('PUT /api/brands/:brandId/card: contrato HTTP estricto', () => {
  it.each([
    { label: 'sellos', stampsEnabled: true, pointsEnabled: false },
    { label: 'puntos', stampsEnabled: false, pointsEnabled: true },
    { label: 'sellos y puntos', stampsEnabled: true, pointsEnabled: true },
  ])('acepta $label y entrega las banderas al servicio', async ({ stampsEnabled, pointsEnabled }) => {
    await withApp(async (server, save) => {
      const response = await request(server).put(url).send(body(stampsEnabled, pointsEnabled));
      expect(response.status).toBe(200);
      expect(save).toHaveBeenCalledExactlyOnceWith(brandId, userId, expect.any(SaveCardDto));
      expect(save.mock.calls[0][2]).toMatchObject({ stampsEnabled, pointsEnabled });
      expect(response.body).toMatchObject({ stampsEnabled, pointsEnabled });
    });
  });

  it('rechaza un campo desconocido antes de invocar el servicio', async () => {
    await withApp(async (server, save) => {
      const response = await request(server).put(url).send({ ...body(true, true), unexpectedFlag: true });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('property unexpectedFlag should not exist');
      expect(save).not.toHaveBeenCalled();
    });
  });

  it('exige pointsEnabled antes de guardar', async () => {
    await withApp(async (server, save) => {
      const { pointsEnabled: _omittedPointsEnabled, ...payload } = body(true, true);
      const response = await request(server).put(url).send(payload);
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('pointsEnabled must be a boolean value');
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe.each(['stampsEnabled', 'pointsEnabled'] as const)('%s conserva el booleano JSON original', (field) => {
    it.each(['false', 'true', 0, 1, {}, null])('rechaza %j en vez de convertirlo', async (value) => {
      await withApp(async (server, save) => {
        const response = await request(server).put(url).send({ ...body(true, true), [field]: value });
        expect(response.status).toBe(400);
        expect(response.body.message).toContain(`${field} must be a boolean value`);
        expect(save).not.toHaveBeenCalled();
      });
    });
  });
});
