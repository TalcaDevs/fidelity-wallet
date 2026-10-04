import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { CardAssetsStorageService } from './card-assets-storage.service.js';

const brandId = 'a0000000-0000-4000-8000-000000000001';
const otherBrandId = 'a0000000-0000-4000-8000-000000000002';
const internalOrigin = 'http://127.0.0.1:54321';
const publicOrigin = 'https://wallet.example';
const bucketPath = '/storage/v1/object/public/card-assets';
const assetPath = `${brandId}/logo-uuid.png`;
const internalUrl = `${internalOrigin}${bucketPath}/${assetPath}`;
const publicUrl = `${publicOrigin}${bucketPath}/${assetPath}`;

function setup() {
  return new CardAssetsStorageService(
    new ConfigService({
      SUPABASE_URL: `${internalOrigin}/`,
      SUPABASE_PUBLIC_URL: `${publicOrigin}/`,
    }),
  );
}

describe('CardAssetsStorageService URL validation', () => {
  it.each([internalUrl, publicUrl])(
    'accepts the configured origin: %s',
    (url) => {
      const storage = setup();
      expect(storage.pathOf(url)).toBe(assetPath);
      expect(storage.belongsToBrand(url, brandId)).toBe(true);
      expect(storage.downloadUrl(url)).toBe(internalUrl);
    },
  );

  it('supports internal URLs when there is no public alias', () => {
    const internalOnly = new CardAssetsStorageService(
      new ConfigService({
        SUPABASE_URL: internalOrigin,
      }),
    );
    expect(internalOnly.pathOf(internalUrl)).toBe(assetPath);
    expect(internalOnly.downloadUrl(internalUrl)).toBe(internalUrl);
    expect(internalOnly.pathOf(publicUrl)).toBeNull();
  });

  it('requires an exact brand folder boundary', () => {
    const storage = setup();
    const foreignUrl = `${publicOrigin}${bucketPath}/${otherBrandId}/logo.png`;
    expect(storage.pathOf(foreignUrl)).toBe(`${otherBrandId}/logo.png`);
    expect(storage.belongsToBrand(foreignUrl, brandId)).toBe(false);
    expect(
      storage.belongsToBrand(
        `${publicOrigin}${bucketPath}/${brandId}-extra/logo.png`,
        brandId,
      ),
    ).toBe(false);
    expect(storage.belongsToBrand(publicUrl, '')).toBe(false);
  });

  it('canonicalizes harmless encoded filename characters before downloading', () => {
    const storage = setup();
    const encoded = `${publicOrigin}${bucketPath}/${brandId}/%6cogo-uuid.png`;
    expect(storage.pathOf(encoded)).toBe(assetPath);
    expect(storage.downloadUrl(encoded)).toBe(internalUrl);
  });

  it.each([
    `${publicOrigin}${bucketPath}/${brandId}/../${otherBrandId}/logo.png`,
    `${publicOrigin}${bucketPath}/${brandId}/./logo.png`,
    `${publicOrigin}${bucketPath}/${brandId}/%2e%2e/${otherBrandId}/logo.png`,
    `${publicOrigin}${bucketPath}/${brandId}/.%2e/${otherBrandId}/logo.png`,
    `${publicOrigin}${bucketPath}/${brandId}/%252e%252e/${otherBrandId}/logo.png`,
    `${publicOrigin}${bucketPath}/${brandId}/%2F${otherBrandId}/logo.png`,
    `${publicOrigin}${bucketPath}/${brandId}/%252F${otherBrandId}/logo.png`,
    `${publicOrigin}${bucketPath}/${brandId}/%5Clogo.png`,
    `${publicOrigin}${bucketPath}/${brandId}/%255Clogo.png`,
    `${publicOrigin}${bucketPath}/${brandId}/\\..\\${otherBrandId}/logo.png`,
    `${publicOrigin}${bucketPath}/${brandId}/logo%.png`,
    `${publicOrigin}${bucketPath}/${brandId}/logo%zz.png`,
    `${publicOrigin}${bucketPath}/${brandId}/logo%00.png`,
    `${publicUrl}?redirect=https://evil.example`,
    `${publicUrl}#fragment`,
    `${publicUrl}?`,
    `${publicUrl}#`,
    `https://user:secret@wallet.example${bucketPath}/${assetPath}`,
    `https://@wallet.example${bucketPath}/${assetPath}`,
    `https://wallet.example.evil.example${bucketPath}/${assetPath}`,
    `https://evil.example${bucketPath}/${assetPath}`,
    `http://wallet.example${bucketPath}/${assetPath}`,
    `https://wallet.example:8443${bucketPath}/${assetPath}`,
    `${publicOrigin}/storage/v1/object/public/card-assets-other/${assetPath}`,
    `${publicOrigin}/storage/v1/object/public/other-bucket/${assetPath}`,
    `${publicOrigin}${bucketPath}/${brandId}`,
    `${publicOrigin}${bucketPath}//${assetPath}`,
    ` ${publicUrl}`,
    `${publicOrigin}${bucketPath}/${brandId}/lo\ngo.png`,
    '//wallet.example/storage/v1/object/public/card-assets/brand/logo.png',
  ])('rejects unsafe URL without normalizing it: %s', (url) => {
    const storage = setup();
    expect(storage.pathOf(url)).toBeNull();
    expect(storage.belongsToBrand(url, brandId)).toBe(false);
    expect(() => storage.downloadUrl(url)).toThrow(BadRequestException);
  });
});
