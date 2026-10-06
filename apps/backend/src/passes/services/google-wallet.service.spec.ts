import crypto from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { DEFAULT_CARD_DESIGN, DEFAULT_CARD_DETAILS, DEFAULT_REGISTRATION } from '@fidelity/shared';
import type { CardView } from '../../cards/card-program.js';
import { GoogleWalletService } from './google-wallet.service.js';
import type { PassData } from '../interfaces/pass-data.interface.js';

describe('GoogleWalletService', () => {
  let service: GoogleWalletService;
  let configService: ConfigService;
  let rsaPrivateKey: string;

  beforeEach(() => {
    // Generar llave RSA sintética en memoria para pruebas criptográficas de RS256
    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    rsaPrivateKey = privateKey;

    const mockConfig: Record<string, string> = {
      GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: 'test-sa@fidelity-wallet.iam.gserviceaccount.com',
      GOOGLE_WALLET_PRIVATE_KEY: rsaPrivateKey,
      GOOGLE_WALLET_ISSUER_ID: '1122334455667788990',
      GOOGLE_WALLET_CLASS_ID: '1122334455667788990.fidelity_test',
      ALLOW_MOCK_PASSES: 'false',
      BACKEND_URL: 'https://api.fidelity.test',
    };

    configService = {
      get: vi.fn((key: string) => mockConfig[key]),
    } as unknown as ConfigService;

    service = new GoogleWalletService(configService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('hasCredentials', () => {
    it('returns true when email, privateKey and issuerId are present', () => {
      expect(service.hasCredentials()).toBe(true);
    });

    it('returns false when email or privateKey is missing', () => {
      vi.spyOn(configService, 'get').mockReturnValue(undefined);
      expect(service.hasCredentials()).toBe(false);
    });

    it('returns false when issuerId is missing in non-mock mode', () => {
      vi.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'GOOGLE_WALLET_ISSUER_ID') return undefined;
        if (key === 'ALLOW_MOCK_PASSES') return 'false';
        if (key === 'GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL') return 'sa@test.com';
        if (key === 'GOOGLE_WALLET_PRIVATE_KEY') return rsaPrivateKey;
        return undefined;
      });
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

      const token1 = await (service as any).getAccessToken();
      expect(token1).toBe('mock-access-token-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://oauth2.googleapis.com/token');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

      const token2 = await (service as any).getAccessToken();
      expect(token2).toBe('mock-access-token-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('deduplicates simultaneous in-flight token requests', async () => {
      let resolvePromise: (value: any) => void;
      const delayedResponse = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const mockFetch = vi.fn().mockImplementation(() => delayedResponse);
      vi.stubGlobal('fetch', mockFetch);

      const promise1 = (service as any).getAccessToken();
      const promise2 = (service as any).getAccessToken();
      const promise3 = (service as any).getAccessToken();

      expect(mockFetch).toHaveBeenCalledTimes(1);

      resolvePromise!({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'shared-token',
          expires_in: 3600,
        }),
      });

      const [token1, token2, token3] = await Promise.all([promise1, promise2, promise3]);
      expect(token1).toBe('shared-token');
      expect(token2).toBe('shared-token');
      expect(token3).toBe('shared-token');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('throws an error if OAuth2 token request fails', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'invalid_grant',
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect((service as any).getAccessToken()).rejects.toThrow(
        /Google OAuth2 token request failed \(400\): invalid_grant/,
      );
    });

    it('returns null if credentials are not configured', async () => {
      vi.spyOn(configService, 'get').mockReturnValue(undefined);
      const token = await (service as any).getAccessToken();
      expect(token).toBeNull();
    });
  });


  const card = (overrides: Partial<CardView> = {}): CardView => ({
    programId: 'prog-123',
    type: 'STAMPS',
    name: 'Tarjeta Café',
    welcomeBalance: 0,
    dailyStampLimit: true,
    stampValidityDays: null,
    validity: { type: 'UNLIMITED', expiresAt: null, days: null },
    registration: DEFAULT_REGISTRATION,
    design: DEFAULT_CARD_DESIGN,
    details: DEFAULT_CARD_DETAILS,
    designVersion: 3,
    ...overrides,
  });

  const passData = (overrides: Partial<PassData> = {}, cardOverrides: Partial<CardView> = {}): PassData => ({
    passId: 'pass-uuid-999',
    serialNumber: 'SN-001',
    passToken: 'token-abc',
    programId: 'prog-123',
    merchantName: 'Café Demo',
    customerLabel: 'María',
    activeStamps: 4,
    targetStamps: 5,
    rewardName: 'Almuerzo gratis',
    nextExpiryAt: null,
    memberSince: new Date('2026-01-15T12:00:00Z'),
    cardExpiresAt: null,
    cardClass: { programId: 'prog-123', brandName: 'Café Demo', card: card(cardOverrides), locations: [] },
    ...overrides,
  });

  const stubWalletApi = (walletResponse: { ok: boolean; status: number; text?: () => Promise<string> }) => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('oauth2.googleapis.com')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'mock-auth-token', expires_in: 3600 }) };
      }
      return { text: async () => '{}', ...walletResponse };
    });
    vi.stubGlobal('fetch', mockFetch);
    return mockFetch;
  };

  const walletCalls = (mockFetch: ReturnType<typeof vi.fn>) =>
    mockFetch.mock.calls.filter((call) => String(call[0]).includes('walletobjects.googleapis.com'));

  const decodeClaims = (url: string) => {
    const token = url.replace('https://pay.google.com/gp/v/save/', '');
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  };

  describe('generateSaveUrl', () => {
    it('generates a valid save URL signed with RS256', () => {
      const url = service.generateSaveUrl(passData());
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

      const url = service.generateSaveUrl(passData());
      expect(url).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\//);
    });

    it('defines the class with the card design so the first save creates it', () => {
      const claims = decodeClaims(service.generateSaveUrl(passData()));
      const [loyaltyClass] = claims.payload.loyaltyClasses;
      expect(loyaltyClass).toMatchObject({
        id: '1122334455667788990.fidelity_test',
        issuerName: 'Café Demo',
        programName: 'Tarjeta Café',
        hexBackgroundColor: DEFAULT_CARD_DESIGN.backgroundColor,
        reviewStatus: 'UNDER_REVIEW',
        accountNameLabel: 'Titular',
      });
      // Google muestra los nombres localizados si la clase ya los tenía (p. ej. "Fidelity wallet").
      expect(loyaltyClass.localizedIssuerName.defaultValue).toEqual({ language: 'es-419', value: 'Café Demo' });
      expect(loyaltyClass.localizedProgramName.defaultValue).toEqual({ language: 'es-419', value: 'Tarjeta Café' });
      // Sin logo propio, el backend dibuja uno: Google lo exige.
      expect(loyaltyClass.programLogo.sourceUri.uri).toBe('https://api.fidelity.test/api/public/cards/prog-123/3/logo');
      const row = loyaltyClass.classTemplateInfo.cardTemplateOverride.cardRowTemplateInfos[0];
      expect(row.twoItems.endItem.firstValue.fields[0].fieldPath).toBe("object.textModulesData['reward']");
    });

    it('shows the stamp strip for the current balance as the hero image', () => {
      const [object] = decodeClaims(service.generateSaveUrl(passData())).payload.loyaltyObjects;
      expect(object.heroImage.sourceUri.uri).toBe('https://api.fidelity.test/api/public/cards/prog-123/3/strip/5/4');
      expect(object.barcode).toEqual({ type: 'QR_CODE', value: 'token-abc', alternateText: 'María' });
      expect(object.accountName).toBe('María');
    });

    it('hides the customer name when the owner turns it off', () => {
      const data = passData({}, { details: { ...DEFAULT_CARD_DETAILS, showCustomerName: false } });
      const [object] = decodeClaims(service.generateSaveUrl(data)).payload.loyaltyObjects;
      expect(object.accountName).toBeUndefined();
      expect(object.barcode.alternateText).toBeUndefined();
    });

    it('adds links, sections, homepage and nearby locations to the class', () => {
      const data = passData(
        {},
        {
          details: {
            ...DEFAULT_CARD_DETAILS,
            links: [{ type: 'INSTAGRAM', label: 'Instagram', value: '@cafe' }],
            sections: [{ header: 'Condiciones', body: 'Un premio por visita' }],
            homepageUrl: 'https://cafe.cl',
            nearbyNotifications: true,
          },
        },
      );
      data.cardClass.locations = [{ latitude: -33.4, longitude: -70.6 }];
      const [loyaltyClass] = decodeClaims(service.generateSaveUrl(data)).payload.loyaltyClasses;
      expect(loyaltyClass.linksModuleData.uris).toEqual([
        { id: 'link_0', uri: 'https://instagram.com/cafe', description: 'Instagram' },
      ]);
      expect(loyaltyClass.textModulesData).toEqual([
        { id: 'section_0', header: 'Condiciones', body: 'Un premio por visita' },
      ]);
      expect(loyaltyClass.homepageUri).toEqual({ uri: 'https://cafe.cl', description: 'Sitio web' });
      expect(loyaltyClass.merchantLocations).toEqual([{ latitude: -33.4, longitude: -70.6 }]);
    });

    it('labels the balance as points and sets the card expiry', () => {
      const data = passData(
        { activeStamps: 120, targetStamps: 500, cardExpiresAt: new Date('2027-01-01T00:00:00Z') },
        { type: 'POINTS' },
      );
      const [object] = decodeClaims(service.generateSaveUrl(data)).payload.loyaltyObjects;
      expect(object.loyaltyPoints).toEqual({ label: 'Puntos', balance: { int: 120 } });
      expect(object.heroImage).toBeUndefined();
      expect(object.validTimeInterval).toEqual({ end: { date: '2027-01-01T00:00:00.000Z' } });
      expect(object.textModulesData).toContainEqual({ id: 'progress', header: 'Estado', body: 'Faltan 380 puntos' });
    });
  });

  it('leaves out images that are not public HTTPS (local development)', () => {
    vi.spyOn(configService, 'get').mockImplementation((key: string) =>
      key === 'BACKEND_URL' ? 'http://192.168.100.151:3000' : ({
        GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: 'test-sa@fidelity-wallet.iam.gserviceaccount.com',
        GOOGLE_WALLET_PRIVATE_KEY: rsaPrivateKey,
        GOOGLE_WALLET_ISSUER_ID: '1122334455667788990',
        GOOGLE_WALLET_CLASS_ID: '1122334455667788990.fidelity_test',
      } as Record<string, string>)[key],
    );
    const data = passData({}, { design: { ...DEFAULT_CARD_DESIGN, wideLogoUrl: 'http://127.0.0.1:54321/x.png' } });
    const { payload } = decodeClaims(service.generateSaveUrl(data));
    // Sin logo público la clase no se puede crear: va solo el objeto, sobre la clase existente.
    expect(payload.loyaltyClasses).toBeUndefined();
    expect(payload.loyaltyObjects[0].heroImage).toBeUndefined();
    expect(payload.loyaltyObjects[0].loyaltyPoints).toEqual({ label: 'Sellos', balance: { int: 4 } });
  });

  describe('updateLoyaltyObject', () => {
    it('executes PATCH request with correct resourceId, payload and singular text', async () => {
      const mockFetch = stubWalletApi({ ok: true, status: 200 });

      await service.updateLoyaltyObject(passData());

      const [[patchUrl, patchOptions]] = walletCalls(mockFetch);
      expect(patchUrl).toBe(
        'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/1122334455667788990.pass-uuid-999',
      );
      expect(patchOptions.method).toBe('PATCH');
      expect(patchOptions.headers['Authorization']).toBe('Bearer mock-auth-token');
      expect(patchOptions.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(patchOptions.body);
      expect(body.loyaltyPoints).toEqual({ balance: { int: 4 }, label: 'Sellos' });
      expect(body.secondaryLoyaltyPoints).toEqual({ balance: { int: 5 }, label: 'Meta' });
      expect(body.textModulesData).toEqual([
        { id: 'balance', header: 'Sellos', body: '4 de 5' },
        { id: 'reward', header: 'Premio', body: 'Almuerzo gratis' },
        { id: 'progress', header: 'Estado', body: 'Falta 1 sello' },
        { id: 'balance_expiry', header: 'Próximo vencimiento', body: 'Tus sellos no vencen' },
      ]);
    });

    it('sets plural status text when remaining stamps > 1', async () => {
      const mockFetch = stubWalletApi({ ok: true, status: 200 });
      await service.updateLoyaltyObject(passData({ activeStamps: 3 }));
      const body = JSON.parse(walletCalls(mockFetch)[0][1].body);
      expect(body.textModulesData).toContainEqual({ id: 'progress', header: 'Estado', body: 'Faltan 2 sellos' });
    });

    it('sets unlocked status text when activeStamps >= targetStamps', async () => {
      const mockFetch = stubWalletApi({ ok: true, status: 200 });
      await service.updateLoyaltyObject(passData({ activeStamps: 5 }));
      const body = JSON.parse(walletCalls(mockFetch)[0][1].body);
      expect(body.textModulesData).toContainEqual({ id: 'progress', header: 'Estado', body: '¡Premio desbloqueado!' });
    });

    it('handles 404 gracefully without throwing error when user has not saved pass yet', async () => {
      stubWalletApi({ ok: false, status: 404, text: async () => '{"error":{"message":"Object not found"}}' });
      await expect(service.updateLoyaltyObject(passData())).resolves.not.toThrow();
    });

    it('handles network failure or Google 500 error gracefully without throwing', async () => {
      stubWalletApi({ ok: false, status: 500, text: async () => 'Internal Google Server Error' });
      await expect(service.updateLoyaltyObject(passData())).resolves.not.toThrow();
    });

    it('skips network call and logs mock message when credentials are missing and ALLOW_MOCK_PASSES is true', async () => {
      vi.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'ALLOW_MOCK_PASSES') return 'true';
        return undefined;
      });

      const mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);

      await service.updateLoyaltyObject(passData());
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns success: false with error when credentials are missing and ALLOW_MOCK_PASSES is false', async () => {
      vi.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'ALLOW_MOCK_PASSES') return 'false';
        return undefined;
      });

      const res = await service.updateLoyaltyObject(passData());
      expect(res.success).toBe(false);
      expect(res.error).toBe('Las credenciales de Google Wallet no están configuradas');
    });
  });

  describe('upsertLoyaltyClass', () => {
    it('patches the existing class', async () => {
      const mockFetch = stubWalletApi({ ok: true, status: 200 });
      await service.upsertLoyaltyClass(passData().cardClass);

      const calls = walletCalls(mockFetch);
      expect(calls).toHaveLength(1);
      expect(calls[0][0]).toBe(
        'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/1122334455667788990.fidelity_test',
      );
      expect(calls[0][1].method).toBe('PATCH');
    });

    it('inserts the class when Google does not have it yet', async () => {
      let walletRequests = 0;
      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('oauth2.googleapis.com')) {
          return { ok: true, status: 200, json: async () => ({ access_token: 't', expires_in: 3600 }) };
        }
        walletRequests += 1;
        return walletRequests === 1
          ? { ok: false, status: 404, text: async () => '' }
          : { ok: true, status: 200, text: async () => '{}' };
      });
      vi.stubGlobal('fetch', mockFetch);

      await service.upsertLoyaltyClass(passData().cardClass);

      const [, insert] = walletCalls(mockFetch);
      expect(insert[0]).toBe('https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass');
      expect(insert[1].method).toBe('POST');
    });
  });
});
