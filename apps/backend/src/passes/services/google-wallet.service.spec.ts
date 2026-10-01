import crypto from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { GoogleWalletService } from './google-wallet.service.js';
import { PassData } from '../interfaces/pass-data.interface.js';

describe('GoogleWalletService', () => {
  let service: GoogleWalletService;
  let configService: ConfigService;
  let rsaPrivateKey: string;

  beforeEach(() => {
    // Generar llave RSA real para pruebas criptográficas de RS256
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    rsaPrivateKey = privateKey;

    const mockConfig: Record<string, string> = {
      GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: 'test-sa@fidelity-wallet.iam.gserviceaccount.com',
      GOOGLE_WALLET_PRIVATE_KEY: rsaPrivateKey,
      GOOGLE_WALLET_ISSUER_ID: '3388000000023211518',
      GOOGLE_WALLET_CLASS_ID: '3388000000023211518.fidelity_test',
      ALLOW_MOCK_PASSES: 'false',
    };

    configService = {
      get: vi.fn((key: string) => mockConfig[key]),
    } as unknown as ConfigService;

    service = new GoogleWalletService(configService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('hasCredentials', () => {
    it('returns true when email, privateKey and issuerId are present', () => {
      expect(service.hasCredentials()).toBe(true);
    });

    it('returns false when any required credential is missing', () => {
      vi.spyOn(configService, 'get').mockReturnValue(undefined);
      expect(service.hasCredentials()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('requests OAuth2 token and caches it for subsequent calls', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'mock-access-token-123',
          expires_in: 3600,
        }),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Primera llamada: debe llamar a fetch hacia https://oauth2.googleapis.com/token
      const token1 = await service.getAccessToken();
      expect(token1).toBe('mock-access-token-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://oauth2.googleapis.com/token');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

      // Segunda llamada: debe retornar el token desde caché sin llamar a fetch de nuevo
      const token2 = await service.getAccessToken();
      expect(token2).toBe('mock-access-token-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('throws an error if OAuth2 token request fails', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'invalid_grant',
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(service.getAccessToken()).rejects.toThrow(
        /Google OAuth2 token request failed \(400\): invalid_grant/,
      );
    });

    it('returns null if credentials are not configured', async () => {
      vi.spyOn(configService, 'get').mockReturnValue(undefined);
      const token = await service.getAccessToken();
      expect(token).toBeNull();
    });
  });

  describe('generateSaveUrl', () => {
    const mockPassData: PassData = {
      passId: '5469e82f-8f2a-45a5-9bf3-543880620027',
      serialNumber: 'SN-001',
      passToken: 'token-abc',
      programId: 'prog-123',
      merchantName: 'Café Demo',
      customerLabel: '12.345.678-5',
      activeStamps: 3,
      targetStamps: 5,
      rewardName: 'Café gratis',
    };

    it('generates a valid save URL signed with RS256', () => {
      const url = service.generateSaveUrl(mockPassData);
      expect(url).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\//);
      const token = url.replace('https://pay.google.com/gp/v/save/', '');
      expect(token.split('.')).toHaveLength(3); // JWT formato header.payload.signature
    });

    it('falls back to mock token when allowMock is true and credentials fail', () => {
      vi.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'ALLOW_MOCK_PASSES') return 'true';
        if (key === 'GOOGLE_WALLET_PRIVATE_KEY') return 'invalid-key';
        return undefined;
      });

      const url = service.generateSaveUrl(mockPassData);
      expect(url).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\//);
    });
  });

  describe('updateLoyaltyObject', () => {
    it('executes PATCH request with correct resourceId and payload', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        callCount++;
        if (url.includes('oauth2.googleapis.com')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: 'mock-auth-token',
              expires_in: 3600,
            }),
          };
        }
        if (url.includes('walletobjects.googleapis.com')) {
          return {
            ok: true,
            status: 200,
            text: async () => '{}',
          };
        }
        return { ok: false, status: 500 };
      });
      vi.stubGlobal('fetch', mockFetch);

      const passId = 'pass-uuid-999';
      await service.updateLoyaltyObject(passId, 4, {
        targetStamps: 5,
        rewardName: 'Almuerzo gratis',
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);

      const patchCall = mockFetch.mock.calls.find((call) =>
        call[0].includes('walletobjects.googleapis.com'),
      );
      expect(patchCall).toBeDefined();
      if (!patchCall) throw new Error('patchCall not found');

      const [patchUrl, patchOptions] = patchCall;
      expect(patchUrl).toBe(
        'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/3388000000023211518.pass-uuid-999',
      );
      expect(patchOptions.method).toBe('PATCH');
      expect(patchOptions.headers['Authorization']).toBe('Bearer mock-auth-token');
      expect(patchOptions.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(patchOptions.body);
      expect(body.loyaltyPoints).toEqual({
        balance: { int: 4 },
        label: 'Sellos',
      });
      expect(body.secondaryLoyaltyPoints).toEqual({
        balance: { int: 5 },
        label: 'Meta',
      });
      expect(body.textModulesData).toEqual([
        { header: 'Premio', body: 'Almuerzo gratis' },
        { header: 'Estado', body: 'Faltan 1 sellos' },
      ]);
    });

    it('sets unlocked status text when activeStamps >= targetStamps', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('oauth2.googleapis.com')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: 'token', expires_in: 3600 }),
          };
        }
        return { ok: true, status: 200, text: async () => '{}' };
      });
      vi.stubGlobal('fetch', mockFetch);

      await service.updateLoyaltyObject('pass-123', 5, {
        targetStamps: 5,
        rewardName: 'Café gratis',
      });

      const patchCall = mockFetch.mock.calls.find((call) =>
        call[0].includes('walletobjects.googleapis.com'),
      );
      expect(patchCall).toBeDefined();
      if (!patchCall) throw new Error('patchCall not found');

      const body = JSON.parse(patchCall[1].body);
      expect(body.textModulesData[1]).toEqual({
        header: 'Estado',
        body: '¡Premio desbloqueado!',
      });
    });

    it('handles 404 gracefully without throwing error when user has not saved pass yet', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('oauth2.googleapis.com')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: 'token', expires_in: 3600 }),
          };
        }
        return {
          ok: false,
          status: 404,
          text: async () => JSON.stringify({ error: { message: 'Object not found' } }),
        };
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(service.updateLoyaltyObject('pass-not-saved', 2)).resolves.not.toThrow();
    });

    it('handles network failure or Google 500 error gracefully without throwing', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('oauth2.googleapis.com')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: 'token', expires_in: 3600 }),
          };
        }
        return {
          ok: false,
          status: 500,
          text: async () => 'Internal Google Server Error',
        };
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(service.updateLoyaltyObject('pass-error', 2)).resolves.not.toThrow();
    });

    it('skips network call and logs mock message when credentials are missing and ALLOW_MOCK_PASSES is true', async () => {
      vi.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'ALLOW_MOCK_PASSES') return 'true';
        return undefined;
      });

      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      await service.updateLoyaltyObject('pass-mock', 3);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
