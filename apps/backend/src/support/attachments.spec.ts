import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { MAX_IMAGE_SIDE, sanitizeImage } from './attachments.js';

const file = (
  buffer: Buffer,
  originalname = 'captura.png',
  mimetype = 'image/png',
) => ({
  buffer,
  originalname,
  mimetype,
  size: buffer.length,
});

const solid = (width = 8, height = 8) =>
  sharp({ create: { width, height, channels: 3, background: '#2563eb' } });

let png: Buffer;
let jpegWithGps: Buffer;

beforeAll(async () => {
  png = await solid().png().toBuffer();
  jpegWithGps = await solid()
    .jpeg()
    .withExifMerge({
      IFD0: { Make: 'TelefonoX', Model: 'Modelo 9' },
      IFD3: { GPSLatitude: '33/1 26/1 0/1' },
    })
    .toBuffer();
});

describe('sanitizeImage', () => {
  it('detects the type by its bytes, not by the declared name or type', async () => {
    const result = await sanitizeImage(file(png, 'foto.jpg', 'image/jpeg'));
    expect(result).toMatchObject({
      mimeType: 'image/png',
      extension: 'png',
      fileName: 'foto.png',
    });
  });

  it('strips EXIF (device and GPS) from photos', async () => {
    expect((await sharp(jpegWithGps).metadata()).exif).toBeDefined();

    const result = await sanitizeImage(
      file(jpegWithGps, 'foto.jpg', 'image/jpeg'),
    );

    expect(result.mimeType).toBe('image/jpeg');
    const meta = await sharp(result.buffer).metadata();
    expect(meta.exif).toBeUndefined();
    expect(result.buffer.includes(Buffer.from('TelefonoX'))).toBe(false);
  });

  it('drops anything hidden after the image (polyglot files)', async () => {
    const polyglot = Buffer.concat([
      png,
      Buffer.from('<script>alert(document.cookie)</script>'),
    ]);
    const result = await sanitizeImage(file(polyglot));
    expect(result.buffer.includes(Buffer.from('<script>'))).toBe(false);
  });

  it('rejects files that only fake the header', async () => {
    const fake = Buffer.concat([
      png.subarray(0, 8),
      Buffer.from('no soy una imagen'),
    ]);
    await expect(sanitizeImage(file(fake))).rejects.toThrow(
      'La captura está dañada o no es una imagen válida',
    );
  });

  it('rejects truncated images', async () => {
    await expect(
      sanitizeImage(file(png.subarray(0, png.length - 20))),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects absurd dimensions before decoding them', async () => {
    const huge = await solid(MAX_IMAGE_SIDE + 1, 1)
      .png()
      .toBuffer();
    await expect(sanitizeImage(file(huge))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects other formats and files over 10 MB', async () => {
    const gif = Buffer.from('GIF89a......');
    await expect(
      sanitizeImage(file(gif, 'x.gif', 'image/gif')),
    ).rejects.toThrow('PNG o JPG');
    await expect(
      sanitizeImage({ ...file(png), size: 10 * 1024 * 1024 + 1 }),
    ).rejects.toThrow('10 MB');
  });

  it('sanitizes the file name', async () => {
    expect(
      (await sanitizeImage(file(png, '../../etc/pass wd.exe'))).fileName,
    ).toBe('etc-pass-wd.png');
    expect((await sanitizeImage(file(png, ''))).fileName).toBe('captura.png');
  });
});
