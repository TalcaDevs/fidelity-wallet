import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CARD_DESIGN,
  DEFAULT_CARD_DETAILS,
  DEFAULT_REGISTRATION,
  type CardConfig,
  type CardConfigDto,
  type CardImageUploadDto,
} from '@fidelity/shared';
import * as httpJson from '../httpJson';
import { getCard, saveCard, uploadCardImage } from '../cardService';

describe('cardService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCard', () => {
    it('requests card configuration for a given brandId', async () => {
      const mockCard: CardConfigDto = {
        type: 'STAMPS',
        name: 'Club Café',
        stampsEnabled: true,
        pointsEnabled: false,
        programId: 'prog-1',
        brandName: 'Café Demo',
        designVersion: 1,
        updatedAt: '2026-10-14T00:00:00.000Z',
        points: { enabled: false, pesosPerPoint: 1000 },
        typeLocked: false,
        customers: 10,
        locations: 1,
        rewards: [],
        welcomeBalance: 0,
        welcomeStamps: 0,
        welcomePoints: 0,
        dailyStampLimit: true,
        stampValidityDays: null,
        validity: { type: 'UNLIMITED', expiresAt: null, days: null },
        registration: { ...DEFAULT_REGISTRATION, name: 'REQUIRED' },
        design: { ...DEFAULT_CARD_DESIGN },
        details: { ...DEFAULT_CARD_DETAILS },
      };

      const spy = vi.spyOn(httpJson, 'requestJson').mockResolvedValue(mockCard);

      const result = await getCard('brand-123');

      expect(spy).toHaveBeenCalledWith(
        '/api/brands/brand-123/card',
        undefined,
        'No pudimos cargar tu tarjeta',
      );
      expect(result).toEqual(mockCard);
    });
  });

  describe('saveCard', () => {
    it('saves card configuration with PUT method and stringified JSON body', async () => {
      const mockConfig: CardConfig = {
        type: 'STAMPS',
        name: 'Club Café Actualizado',
        stampsEnabled: true,
        pointsEnabled: false,
        rewards: [],
        welcomeBalance: 1,
        welcomeStamps: 1,
        welcomePoints: 0,
        dailyStampLimit: true,
        stampValidityDays: 30,
        validity: { type: 'UNLIMITED', expiresAt: null, days: null },
        registration: { ...DEFAULT_REGISTRATION, name: 'REQUIRED' },
        design: { ...DEFAULT_CARD_DESIGN },
        details: { ...DEFAULT_CARD_DETAILS },
      };

      const spy = vi.spyOn(httpJson, 'requestJson').mockResolvedValue(mockConfig);

      const result = await saveCard('brand-123', mockConfig);

      expect(spy).toHaveBeenCalledWith(
        '/api/brands/brand-123/card',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockConfig),
        },
        'No pudimos guardar la tarjeta',
      );
      expect(result).toEqual(mockConfig);
    });
  });

  describe('uploadCardImage', () => {
    it('uploads an image using multipart FormData with kind and image fields', async () => {
      const mockResponse: CardImageUploadDto = {
        url: 'https://storage.example.com/logo.png',
      };
      const file = new File(['dummy-bytes'], 'logo.png', { type: 'image/png' });

      let capturedInit: RequestInit | undefined;
      const spy = vi.spyOn(httpJson, 'requestJson').mockImplementation(async (_path, init) => {
        capturedInit = init;
        return mockResponse;
      });

      const result = await uploadCardImage('brand-123', 'logo', file);

      expect(spy).toHaveBeenCalledWith(
        '/api/brands/brand-123/card/images',
        expect.objectContaining({ method: 'POST' }),
        'No pudimos subir la imagen',
      );
      expect(result).toEqual(mockResponse);

      expect(capturedInit?.body).toBeInstanceOf(FormData);
      const formData = capturedInit?.body as FormData;
      expect(formData.get('kind')).toBe('logo');
      expect(formData.get('image')).toBe(file);
    });
  });
});
