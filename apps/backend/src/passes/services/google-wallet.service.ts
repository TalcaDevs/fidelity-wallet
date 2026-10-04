import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { CARD_IMAGE_KINDS, IMAGE_FIELD_OF } from '@fidelity/shared';
import { backendBaseUrl } from '../../cards/card-urls.js';
import { publicStorageUrl } from '../../common/storage/storage-url.js';
import type { CardClassData, PassData } from '../interfaces/pass-data.interface.js';
import { buildLoyaltyClass, buildLoyaltyObject, buildObjectState } from './google-wallet-payloads.js';

const WALLET_API = 'https://walletobjects.googleapis.com/walletobjects/v1';

interface CachedToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class GoogleWalletService {
  private readonly logger = new Logger(GoogleWalletService.name);
  private cachedToken: CachedToken | null = null;
  private tokenPromise: Promise<string | null> | null = null;

  constructor(private readonly configService: ConfigService) {}

  public hasCredentials(): boolean {
    const email = this.getServiceAccountEmail();
    const privateKey = this.getNormalizedPrivateKey();
    const issuerId = this.getIssuerId();

    return Boolean(email && privateKey && issuerId);
  }

  // --- MÉTODOS PÚBLICOS DE NEGOCIO ---

  public generateSaveUrl(data: PassData): string {
    const claims = this.buildSaveClaims(this.withPublicPassImages(data));

    if (this.hasCredentials()) {
      try {
        const privateKey = this.getNormalizedPrivateKey() ?? '';
        const token = jwt.sign(claims, privateKey, { algorithm: 'RS256' });
        return `https://pay.google.com/gp/v/save/${token}`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Fallo en la firma del JWT de Google Wallet: ${msg}`);
        const allowMock = this.isMockAllowed();

        if (!allowMock) {
          throw new InternalServerErrorException(
            'Fallo en la firma del JWT de Google Wallet',
          );
        }
        this.logger.warn('Utilizando URL sandbox en modo de desarrollo.');
      }
    } else {
      const allowMock = this.isMockAllowed();

      if (!allowMock) {
        throw new InternalServerErrorException(
          'Las credenciales de Google Wallet no están configuradas',
        );
      }
    }

    // Mock fallback para desarrollo / Sandbox: JWT base64url sin firma
    const mockToken = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return `https://pay.google.com/gp/v/save/${mockToken}`;
  }

  /** Saldo, textos e imagen del pase de un cliente. 404 = el cliente aún no lo guardó. */
  public async updateLoyaltyObject(data: PassData): Promise<void> {
    const { passId, activeStamps } = data;
    const accessToken = await this.liveAccessToken(`pass ${passId} points updated to ${activeStamps}`);
    if (!accessToken) return;

    try {
      const resourceId = this.resolveResourceId(passId);
      const payload = buildObjectState(this.withPublicPassImages(data), this.baseUrl());
      const res = await this.executePatchRequest(resourceId, payload, accessToken);

      await this.handlePatchResponse(res, passId, activeStamps);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[Google Wallet API] Error updating loyaltyObject for pass ${passId}: ${msg}`,
      );
    }
  }

  /**
   * Publica el diseño de la tarjeta en su clase. Google la aplica a todos los pases ya guardados.
   * La clase se crea sola con el primer pase (va en el JWT); si aún no existe, se inserta.
   */
  public async upsertLoyaltyClass(data: CardClassData): Promise<void> {
    const accessToken = await this.liveAccessToken(`class of program ${data.programId} published`);
    if (!accessToken) return;

    const classId = this.resolveClassId(data.programId);
    const payload = buildLoyaltyClass(classId, this.withPublicImages(data), this.baseUrl());
    try {
      let res = await this.walletRequest('PATCH', `/loyaltyClass/${classId}`, payload, accessToken);
      if (res.status === 404) {
        res = await this.walletRequest('POST', '/loyaltyClass', payload, accessToken);
      }
      if (res.ok) {
        this.logger.log(`[Google Wallet API] Published loyaltyClass ${classId}`);
        return;
      }
      const errBody = await res.text().catch(() => '');
      this.logger.warn(`[Google Wallet API] Failed to publish class ${classId} (${res.status}): ${errBody}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[Google Wallet API] Error publishing class ${classId}: ${msg}`);
    }
  }

  /** Token para llamar a la API real; null en modo mock o sin credenciales (solo se registra). */
  private async liveAccessToken(action: string): Promise<string | null> {
    if (!this.hasCredentials()) {
      if (this.isMockAllowed()) {
        this.logger.log(`[Google Wallet API Mock] ${action} (mock mode: no credentials)`);
      } else {
        this.logger.warn(`[Google Wallet API] Missing credentials, skipping: ${action}`);
      }
      return null;
    }
    try {
      const token = await this.getAccessToken();
      if (!token) this.logger.warn(`[Google Wallet API] Could not obtain OAuth2 token: ${action}`);
      return token;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`[Google Wallet API] OAuth2 error (${action}): ${msg}`);
      return null;
    }
  }

  /** Las imágenes subidas con la URL interna del Storage se publican con su origen público. */
  private withPublicImages(cardClass: CardClassData): CardClassData {
    const design = { ...cardClass.card.design };
    for (const kind of CARD_IMAGE_KINDS) {
      const url = design[IMAGE_FIELD_OF[kind]];
      if (url) design[IMAGE_FIELD_OF[kind]] = publicStorageUrl(url, this.configService);
    }
    return { ...cardClass, card: { ...cardClass.card, design } };
  }

  private withPublicPassImages(data: PassData): PassData {
    return { ...data, cardClass: this.withPublicImages(data.cardClass) };
  }

  private baseUrl(): string {
    return backendBaseUrl(this.configService.get<string>('BACKEND_URL') || process.env.BACKEND_URL);
  }

  private async getAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60_000) {
      return this.cachedToken.token;
    }

    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    this.tokenPromise = this.fetchAndCacheToken().finally(() => {
      this.tokenPromise = null;
    });

    return this.tokenPromise;
  }

  private async fetchAndCacheToken(): Promise<string | null> {
    const email = this.getServiceAccountEmail();
    const privateKey = this.getNormalizedPrivateKey();

    if (!email || !privateKey) {
      return null;
    }

    const assertion = this.signOAuthAssertion(email, privateKey);
    const tokenData = await this.requestOAuthToken(assertion);

    const now = Date.now();
    this.cachedToken = {
      token: tokenData.access_token,
      expiresAt: now + (tokenData.expires_in ?? 3600) * 1000,
    };

    return this.cachedToken.token;
  }

  // --- MÉTODOS PRIVADOS: CONFIGURACIÓN E IDENTIFICADORES ---

  private isMockAllowed(): boolean {
    return this.configService.get<string>('ALLOW_MOCK_PASSES') === 'true';
  }

  private getIssuerId(): string | null {
    const configuredIssuer =
      this.configService.get<string>('GOOGLE_WALLET_ISSUER_ID') ||
      process.env.GOOGLE_WALLET_ISSUER_ID;

    if (configuredIssuer) {
      return configuredIssuer;
    }

    return this.isMockAllowed() ? '3388000000022314567' : null;
  }

  private getServiceAccountEmail(): string | null {
    return (
      this.configService.get<string>('GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL') ||
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL ||
      null
    );
  }

  private getNormalizedPrivateKey(): string | null {
    const raw =
      this.configService.get<string>('GOOGLE_WALLET_PRIVATE_KEY') ||
      process.env.GOOGLE_WALLET_PRIVATE_KEY;
    return raw ? raw.replace(/\\n/g, '\n') : null;
  }

  private resolveResourceId(passId: string): string {
    const issuerId = this.getIssuerId() ?? 'mock_issuer';
    return `${issuerId}.${passId}`;
  }

  private resolveClassId(programId: string): string {
    const customClassId =
      this.configService.get<string>('GOOGLE_WALLET_CLASS_ID') ||
      process.env.GOOGLE_WALLET_CLASS_ID;

    if (customClassId) {
      return customClassId;
    }

    const issuerId = this.getIssuerId() ?? 'mock_issuer';
    return `${issuerId}.fidelity_${programId.replace(/-/g, '_')}`;
  }

  // --- MÉTODOS PRIVADOS: PAYLOAD BUILDERS ---

  private buildSaveClaims(data: PassData): Record<string, unknown> {
    const objectId = this.resolveResourceId(data.passId);
    const classId = this.resolveClassId(data.programId);
    const email =
      this.getServiceAccountEmail() || 'service-account@fidelity-wallet.iam.gserviceaccount.com';
    const baseUrl = this.baseUrl();
    const loyaltyClass = buildLoyaltyClass(classId, data.cardClass, baseUrl);

    return {
      iss: email,
      aud: 'google',
      origins: [],
      typ: 'savetowallet',
      payload: {
        // Si la clase ya existe Google la deja como está: los cambios de diseño se publican aparte.
        // Sin logo público no se puede crear, así que en ese caso solo va el objeto.
        ...(loyaltyClass.programLogo ? { loyaltyClasses: [loyaltyClass] } : {}),
        loyaltyObjects: [buildLoyaltyObject(objectId, classId, data, baseUrl)],
      },
    };
  }

  // --- MÉTODOS PRIVADOS: HTTP Y COMUNICACIÓN EXTERNA ---

  private signOAuthAssertion(email: string, privateKey: string): string {
    const nowSec = Math.floor(Date.now() / 1000);
    return jwt.sign(
      {
        iss: email,
        scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
        aud: 'https://oauth2.googleapis.com/token',
        exp: nowSec + 3600,
        iat: nowSec,
      },
      privateKey,
      { algorithm: 'RS256' },
    );
  }

  private async requestOAuthToken(
    assertion: string,
  ): Promise<{ access_token: string; expires_in?: number }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Google OAuth2 token request failed (${response.status}): ${errorText}`);
    }

    return (await response.json()) as { access_token: string; expires_in?: number };
  }

  private executePatchRequest(
    resourceId: string,
    payload: Record<string, unknown>,
    accessToken: string,
  ): Promise<Response> {
    return this.walletRequest('PATCH', `/loyaltyObject/${resourceId}`, payload, accessToken);
  }

  private walletRequest(
    method: 'PATCH' | 'POST',
    path: string,
    payload: Record<string, unknown>,
    accessToken: string,
  ): Promise<Response> {
    return fetch(`${WALLET_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  }

  private async handlePatchResponse(
    res: Response,
    passId: string,
    activeStamps: number,
  ): Promise<void> {
    if (res.ok) {
      this.logger.log(
        `[Google Wallet API] Successfully patched loyaltyObject for pass ${passId} (stamps: ${activeStamps})`,
      );
      return;
    }

    if (res.status === 404) {
      this.logger.debug(
        `[Google Wallet API] LoyaltyObject not found (404) for pass ${passId}. User has likely not saved it to wallet yet.`,
      );
      return;
    }

    const errBody = await res.text().catch(() => '');
    this.logger.warn(
      `[Google Wallet API] Failed to patch pass ${passId} (${res.status}): ${errBody}`,
    );
  }
}
