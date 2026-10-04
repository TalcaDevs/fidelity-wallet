import { NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { CardAssetsStorageService } from './card-assets-storage.service.js';
import { CardRenderService } from './card-render.service.js';

const brandId = 'a0000000-0000-4000-8000-000000000001';
const programId = 'b0000000-0000-4000-8000-000000000001';
const bucket = 'http://127.0.0.1:54321/storage/v1/object/public/card-assets';

function setup(design: Record<string, unknown> = {}) {
  const prisma = {
    loyaltyProgram: {
      findUnique: vi.fn().mockResolvedValue({
        id: programId,
        brandId,
        type: 'STAMPS',
        name: 'Tarjeta',
        design,
        details: {},
        registration: {},
        designVersion: 2,
      }),
    },
  };
  const storage = {
    belongsToBrand: (url: string, id: string) => url.startsWith(`${bucket}/${id}/`),
    downloadUrl: (url: string) => url,
  };
  const service = new CardRenderService(
    prisma as unknown as PrismaService,
    storage as unknown as CardAssetsStorageService,
  );
  return { prisma, service };
}

describe('CardRenderService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('draws the stamp strip at the size Google Wallet expects, once per version', async () => {
    const { service, prisma } = setup();
    const png = await service.strip(programId, 2, 10, 3);
    const meta = await sharp(png).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['png', 1032, 336]);

    await service.strip(programId, 2, 10, 3);
    expect(prisma.loyaltyProgram.findUnique).toHaveBeenCalledTimes(1);
  });

  it('draws a fallback logo', async () => {
    const meta = await sharp(await setup().service.logo(programId, 2)).metadata();
    expect([meta.width, meta.height]).toEqual([660, 660]);
  });

  it('does not render versions that do not exist yet', async () => {
    await expect(setup().service.strip(programId, 3, 10, 3)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('only downloads images from the brand folder', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { service } = setup({ heroImageUrl: 'https://evil.example/hero.jpg' });
    await service.strip(programId, 2, 5, 1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('embeds the hero image of the brand behind the stamps', async () => {
    const hero = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#00ff00' } })
      .jpeg()
      .toBuffer();
    const fetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array(hero), { headers: { 'content-type': 'image/jpeg' } }),
    );
    vi.stubGlobal('fetch', fetch);
    const { service } = setup({ heroImageUrl: `${bucket}/${brandId}/hero.jpg` });

    const png = await service.strip(programId, 2, 5, 1);
    expect(fetch).toHaveBeenCalledWith(
      `${bucket}/${brandId}/hero.jpg`,
      expect.objectContaining({ redirect: 'error', signal: expect.any(AbortSignal) }),
    );
    const { data } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    // Esquina superior izquierda: verde de la foto oscurecido por la capa, no el color de la tarjeta.
    expect(data[1]).toBeGreaterThan(data[0]);
  });
});
