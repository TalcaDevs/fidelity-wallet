import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { GoogleWalletService } from './google-wallet.service.js';

describe('GoogleWalletService', () => {
  let service: GoogleWalletService;
  let configService: ConfigService;

  const mockEmail = 'service-account@fidelity-wallet.iam.gserviceaccount.com';
  const mockPrivateKey = 'mock-private-key';
  const mockIssuerId = '3388000000023211518';

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(jwt, 'sign').mockReturnValue('mock-signed-jwt' as any);
    configService = {
      get: vi.fn((key: string) => {
        if (key === 'GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL') return mockEmail;
        if (key === 'GOOGLE_WALLET_PRIVATE_KEY') return mockPrivateKey;
        if (key === 'GOOGLE_WALLET_ISSUER_ID') return mockIssuerId;
        if (key === 'ALLOW_MOCK_PASSES') return 'true';
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new GoogleWalletService(configService);
  });

  describe('hasCredentials', () => {
    it('returns true when all required credentials exist', () => {
      expect(service.hasCredentials()).toBe(true);
    });

    it('returns false when any required credential is missing', () => {
      vi.spyOn(configService, 'get').mockReturnValue(undefined);
      expect(service.hasCredentials()).toBe(false);
    });
  });

  describe('updateLoyaltyObject', () => {
    it('skips gracefully if credentials are not configured', async () => {
      vi.spyOn(service, 'hasCredentials').mockReturnValue(false);
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      await service.updateLoyaltyObject('pass-123', 5);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('patches loyaltyObject with activeStamps, targetStamps and rewardName', async () => {
      const fetchMock = vi.fn();
      // First fetch: OAuth token request
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'mock-oauth-token', expires_in: 3600 }),
      });
      // Second fetch: PATCH loyaltyObject
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ loyaltyPoints: { balance: { int: 5 } } }),
      });
      globalThis.fetch = fetchMock;

      await service.updateLoyaltyObject('pass-123', 5, {
        targetStamps: 10,
        rewardName: 'Café gratis',
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);

      // Verify OAuth call
      expect(fetchMock.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token');

      // Verify PATCH call
      const patchUrl = fetchMock.mock.calls[1][0];
      const patchOptions = fetchMock.mock.calls[1][1];
      expect(patchUrl).toBe(
        `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${mockIssuerId}.pass-123`,
      );
      expect(patchOptions.method).toBe('PATCH');
      expect(patchOptions.headers.Authorization).toBe('Bearer mock-oauth-token');

      const body = JSON.parse(patchOptions.body);
      expect(body.loyaltyPoints.balance.int).toBe(5);
      expect(body.secondaryLoyaltyPoints.balance.int).toBe(10);
      expect(body.textModulesData[0].body).toBe('Café gratis');
    });

    it('caches access token across multiple calls within expiration window', async () => {
      const fetchMock = vi.fn();
      // First call: OAuth token
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'cached-token', expires_in: 3600 }),
      });
      // First call: PATCH
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
      // Second call: PATCH only (uses cached token)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
      globalThis.fetch = fetchMock;

      await service.updateLoyaltyObject('pass-1', 3);
      await service.updateLoyaltyObject('pass-2', 4);

      // 1 OAuth call + 2 PATCH calls = 3 calls total
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer cached-token');
    });

    it('handles 404 cleanly without throwing an exception', async () => {
      const fetchMock = vi.fn();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'mock-token', expires_in: 3600 }),
      });
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });
      globalThis.fetch = fetchMock;

      await expect(service.updateLoyaltyObject('not-found-pass', 1)).resolves.not.toThrow();
    });
  });
});
