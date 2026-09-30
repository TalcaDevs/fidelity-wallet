import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { validateImage } from './attachments.js';

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
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

describe('validateImage', () => {
  it('detects PNG and JPEG by their bytes, not by the declared type', () => {
    expect(validateImage(file(png, 'a.jpg', 'image/jpeg'))).toMatchObject({
      mimeType: 'image/png',
      extension: 'png',
    });
    expect(validateImage(file(jpeg, 'a.png', 'image/png'))).toMatchObject({
      mimeType: 'image/jpeg',
      extension: 'jpg',
    });
  });

  it('rejects anything else even if it claims to be an image', () => {
    expect(() =>
      validateImage(file(Buffer.from('<svg onload=alert(1)>'), 'x.png')),
    ).toThrow(BadRequestException);
  });

  it('rejects files over 10 MB', () => {
    const big = { ...file(png), size: 10 * 1024 * 1024 + 1 };
    expect(() => validateImage(big)).toThrow('10 MB');
  });

  it('sanitizes the file name and forces the detected extension', () => {
    expect(validateImage(file(png, '../../etc/pass wd.exe')).fileName).toBe(
      'etc-pass-wd.png',
    );
    expect(validateImage(file(png, '')).fileName).toBe('captura.png');
  });
});
