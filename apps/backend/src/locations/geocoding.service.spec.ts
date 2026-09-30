import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GeocodingService,
  MAX_PENDING_REQUESTS,
  matchRegion,
  toGeocodeResult,
} from './geocoding.service.js';

const config = { get: () => undefined } as unknown as ConfigService;
const providencia = {
  display_name:
    '2124, Avenida Providencia, Providencia, Región Metropolitana de Santiago, Chile',
  lat: '-33.4213',
  lon: '-70.6088',
  address: {
    road: 'Avenida Providencia',
    house_number: '2124',
    city: 'Providencia',
    state: 'Región Metropolitana de Santiago',
  },
};

afterEach(() => vi.unstubAllGlobals());

describe('geocoding', () => {
  it('maps Nominatim regions to the Chilean region list', () => {
    expect(matchRegion('Región Metropolitana de Santiago')).toBe(
      'Metropolitana',
    );
    expect(matchRegion('Región de Ñuble')).toBe('Ñuble');
    expect(matchRegion('Región del Biobío')).toBe('Biobío');
    expect(matchRegion(undefined)).toBeNull();
  });

  it('extracts street, commune and coordinates', () => {
    expect(toGeocodeResult(providencia)).toMatchObject({
      address: 'Avenida Providencia 2124',
      commune: 'Providencia',
      region: 'Metropolitana',
      latitude: -33.4213,
      longitude: -70.6088,
    });
  });

  it('identifies itself, limits the search to Chile and caches repeated queries', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([providencia]),
    });
    vi.stubGlobal('fetch', fetchMock);
    const service = new GeocodingService(config);

    await service.search('Providencia 2124');
    await service.search('  providencia 2124 ');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('countrycodes=cl');
    expect(init.headers['User-Agent']).toMatch(/^FidelityWallet\//);
  });

  it('answers 503 when Nominatim fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429 }),
    );
    await expect(new GeocodingService(config).search('algo')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('rejects right away once too many searches are waiting, instead of queueing forever', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    const service = new GeocodingService(config);

    for (let i = 0; i < MAX_PENDING_REQUESTS; i++)
      void service.search(`calle ${i}`);
    await expect(service.search('una mas')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('shares one upstream request between identical searches in flight', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([providencia]),
      });
    vi.stubGlobal('fetch', fetchMock);
    const service = new GeocodingService(config);

    const [a, b] = await Promise.all([
      service.search('Merced 838'),
      service.search('merced 838'),
    ]);
    expect(a).toEqual(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
