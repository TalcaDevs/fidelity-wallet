import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { PassData } from '../interfaces/pass-data.interface.js';

export const GOOGLE_PAY_SAVE_URL = 'https://pay.google.com/gp/v/save/';

export interface UpdateLoyaltyObjectOptions {
  targetStamps?: number;
  rewardName?: string;
}

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
    const claims = this.buildSaveClaims(data);

    if (this.hasCredentials()) {
      try {
        const privateKey = this.getNormalizedPrivateKey() ?? '';
        const token = jwt.sign(claims, privateKey, { algorithm: 'RS256' });
        const saveUrl = `${GOOGLE_PAY_SAVE_URL}${token}`;
        return saveUrl;
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
    const saveUrl = `${GOOGLE_PAY_SAVE_URL}${mockToken}`;
    return saveUrl;
  }

  public async updateLoyaltyObject(
    passId: string,
    activeStamps: number,
    options?: UpdateLoyaltyObjectOptions,
  ): Promise<void> {
    if (!this.hasCredentials()) {
      if (this.isMockAllowed()) {
        this.logger.log(
          `[Google Wallet API Mock] Pass ${passId} points updated to ${activeStamps} (mock mode: no credentials)`,
        );
        return;
      }
      this.logger.warn(
        `[Google Wallet API] Missing credentials, skipping live update for pass ${passId}`,
      );
      return;
    }

    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        this.logger.warn(`[Google Wallet API] Could not obtain OAuth2 token for pass ${passId}`);
        return;
      }

      const resourceId = this.resolveResourceId(passId);
      const payload = this.buildPatchPayload(activeStamps, options);
      const res = await this.executePatchRequest(resourceId, payload, accessToken);

      await this.handlePatchResponse(res, passId, activeStamps);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[Google Wallet API] Error updating loyaltyObject for pass ${passId}: ${msg}`,
      );
    }
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

    return {
      iss: email,
      aud: 'google',
      origins: [],
      typ: 'savetowallet',
      payload: {
        loyaltyObjects: [
          {
            id: objectId,
            classId,
            state: 'ACTIVE',
            accountId: data.customerLabel,
            accountName: data.merchantName,
            barcode: {
              type: 'QR_CODE',
              value: data.passToken,
              alternateText: data.customerLabel,
            },
            loyaltyPoints: {
              balance: {
                int: data.activeStamps,
              },
              label: 'Sellos',
            },
            secondaryLoyaltyPoints: {
              balance: {
                int: data.targetStamps,
              },
              label: 'Meta',
            },
            textModulesData: [
              {
                header: 'Premio',
                body: data.rewardName,
              },
            ],
          },
        ],
      },
    };
  }

  private buildPatchPayload(
    activeStamps: number,
    options?: UpdateLoyaltyObjectOptions,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      loyaltyPoints: {
        balance: {
          int: activeStamps,
        },
        label: 'Sellos',
      },
    };

    if (typeof options?.targetStamps === 'number') {
      payload.secondaryLoyaltyPoints = {
        balance: {
          int: options.targetStamps,
        },
        label: 'Meta',
      };

      payload.textModulesData = [
        ...(options.rewardName ? [{ header: 'Premio', body: options.rewardName }] : []),
        { header: 'Estado', body: this.buildStatusText(activeStamps, options.targetStamps) },
      ];
    }

    return payload;
  }

  private buildStatusText(activeStamps: number, targetStamps: number): string {
    if (activeStamps >= targetStamps) {
      return '¡Premio desbloqueado!';
    }
    const remaining = targetStamps - activeStamps;
    return remaining === 1 ? 'Falta 1 sello' : `Faltan ${remaining} sellos`;
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

  private async executePatchRequest(
    resourceId: string,
    payload: Record<string, unknown>,
    accessToken: string,
  ): Promise<Response> {
    const patchUrl = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${resourceId}`;
    return fetch(patchUrl, {
      method: 'PATCH',
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
