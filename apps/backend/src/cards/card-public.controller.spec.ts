import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { STAMPS_TARGET_MAX } from '@fidelity/shared';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardPublicController } from './card-public.controller.js';
import { CardRenderService } from './card-render.service.js';

const programId = '8faee575-2031-480e-8a59-c367a7af3624';
const url = `/public/cards/${programId}/1`;
const image = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('CardPublicController HTTP', () => {
  let app: INestApplication;
  const render = {
    strip: vi.fn().mockResolvedValue(image),
    logo: vi.fn().mockResolvedValue(image),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 2 }])],
      controllers: [CardPublicController],
      providers: [
        { provide: CardRenderService, useValue: render },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it.each(['strip/5/2', 'logo'])('serves public PNGs with immutable caching: %s', async (path) => {
    const response = await request(app.getHttpServer())
      .get(`${url}/${path}`)
      .expect(200)
      .expect('Content-Type', 'image/png')
      .expect('Cache-Control', 'public, max-age=31536000, immutable');

    expect(response.body).toEqual(image);
    if (path === 'logo') expect(render.logo).toHaveBeenCalledWith(programId, 1);
    else expect(render.strip).toHaveBeenCalledWith(programId, 1, 5, 2);
  });

  it('limits strip rendering across changing target and filled parameters', async () => {
    await request(app.getHttpServer()).get(`${url}/strip/5/0`).expect(200);
    await request(app.getHttpServer()).get(`${url}/strip/6/1`).expect(200);
    await request(app.getHttpServer()).get(`${url}/strip/7/2`).expect(429);

    expect(render.strip).toHaveBeenCalledTimes(2);
    expect(render.strip).not.toHaveBeenCalledWith(programId, 1, 7, 2);
  });

  it('limits logo rendering', async () => {
    await request(app.getHttpServer()).get(`${url}/logo`).expect(200);
    await request(app.getHttpServer()).get(`${url}/logo`).expect(200);
    await request(app.getHttpServer()).get(`${url}/logo`).expect(429);

    expect(render.logo).toHaveBeenCalledTimes(2);
  });

  it.each([
    'strip/0/0',
    `strip/${STAMPS_TARGET_MAX + 1}/0`,
    'strip/5/-1',
    'strip/5/6',
  ])('rejects invalid balances before rendering: %s', async (path) => {
    await request(app.getHttpServer()).get(`${url}/${path}`).expect(404);
    expect(render.strip).not.toHaveBeenCalled();
  });
});
