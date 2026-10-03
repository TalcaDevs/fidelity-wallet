import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { PassData } from '../interfaces/pass-data.interface.js';

@Injectable()
export class GoogleWalletService {
  private readonly logger = new Logger(GoogleWalletService.name);

  constructor(private readonly configService: ConfigService) {}

  public hasCredentials(): boolean {
    const email =
      this.configService.get<string>('GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL') ||
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
    const privateKey =
      this.configService.get<string>('GOOGLE_WALLET_PRIVATE_KEY') ||
      process.env.GOOGLE_WALLET_PRIVATE_KEY;
    const issuerId =
      this.configService.get<string>('GOOGLE_WALLET_ISSUER_ID') ||
      process.env.GOOGLE_WALLET_ISSUER_ID;

    return Boolean(email && privateKey && issuerId);
  }

  public generateSaveUrl(data: PassData): string {
    const issuerId =
      this.configService.get<string>('GOOGLE_WALLET_ISSUER_ID') ||
      process.env.GOOGLE_WALLET_ISSUER_ID ||
      '3388000000022314567';

    const objectId = `${issuerId}.${data.passId}`;
    // Permite override con GOOGLE_WALLET_CLASS_ID para entornos de desarrollo/sandbox
    const classId =
      this.configService.get<string>('GOOGLE_WALLET_CLASS_ID') ||
      process.env.GOOGLE_WALLET_CLASS_ID ||
      `${issuerId}.fidelity_${data.programId.replace(/-/g, '_')}`;

    const claims = {
      iss:
        this.configService.get<string>('GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL') ||
        process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL ||
        'service-account@fidelity-wallet.iam.gserviceaccount.com',
      aud: 'google',
      // origins: [] permite abrir el enlace de guardado desde cualquier origen o app móvil
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

    if (this.hasCredentials()) {
      try {
        const privateKey = (
          this.configService.get<string>('GOOGLE_WALLET_PRIVATE_KEY') ||
          process.env.GOOGLE_WALLET_PRIVATE_KEY ||
          ''
        ).replace(/\\n/g, '\n');

        const token = jwt.sign(claims, privateKey, { algorithm: 'RS256' });
        return `https://pay.google.com/gp/v/save/${token}`;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Fallo en la firma del JWT de Google Wallet: ${msg}`);
        const allowMock = this.configService.get<string>('ALLOW_MOCK_PASSES') === 'true';

        if (!allowMock) {
          throw new InternalServerErrorException(
            'Fallo en la firma del JWT de Google Wallet',
          );
        }
        this.logger.warn('Utilizando URL sandbox en modo de desarrollo.');
      }
    } else {
      const allowMock = this.configService.get<string>('ALLOW_MOCK_PASSES') === 'true';

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

  private cachedAccessToken: string | null = null;
  private tokenExpiresAt = 0;

  private async getAccessToken(): Promise<string | null> {
    const now = Date.now();
    if (this.cachedAccessToken && now < this.tokenExpiresAt - 60_000) {
      return this.cachedAccessToken;
    }

    const email =
      this.configService.get<string>('GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL') ||
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
    const rawKey =
      this.configService.get<string>('GOOGLE_WALLET_PRIVATE_KEY') ||
      process.env.GOOGLE_WALLET_PRIVATE_KEY;

    if (!email || !rawKey) return null;

    const privateKey = rawKey.replace(/\\n/g, '\n');
    const nowSeconds = Math.floor(now / 1000);

    const claims = {
      iss: email,
      scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
      aud: 'https://oauth2.googleapis.com/token',
      exp: nowSeconds + 3600,
      iat: nowSeconds,
    };

    try {
      const assertion = jwt.sign(claims, privateKey, { algorithm: 'RS256' });
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`Error requesting Google Wallet OAuth token (${res.status}): ${errorText}`);
        return null;
      }

      const data = (await res.json()) as { access_token?: string; expires_in?: number };
      if (!data.access_token) return null;

      this.cachedAccessToken = data.access_token;
      this.tokenExpiresAt = now + (data.expires_in ?? 3600) * 1000;
      return this.cachedAccessToken;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to obtain Google Wallet access token: ${msg}`);
      return null;
    }
  }

  async updateLoyaltyObject(
    passId: string,
    activeStamps: number,
    options?: { targetStamps?: number; rewardName?: string },
  ): Promise<void> {
    if (!this.hasCredentials()) {
      this.logger.debug(
        `[Google Wallet Push] Skipping update for passId: ${passId} (no credentials configured)`,
      );
      return;
    }

    const token = await this.getAccessToken();
    if (!token) {
      this.logger.warn(
        `[Google Wallet Push] Skipping update for passId: ${passId} (unable to acquire access token)`,
      );
      return;
    }

    const issuerId =
      this.configService.get<string>('GOOGLE_WALLET_ISSUER_ID') ||
      process.env.GOOGLE_WALLET_ISSUER_ID;
    const objectId = `${issuerId}.${passId}`;

    const payload: Record<string, unknown> = {
      loyaltyPoints: {
        label: 'Sellos',
        balance: {
          int: activeStamps,
        },
      },
    };

    if (options?.targetStamps !== undefined) {
      payload.secondaryLoyaltyPoints = {
        label: 'Meta',
        balance: {
          int: options.targetStamps,
        },
      };
    }

    if (options?.rewardName) {
      payload.textModulesData = [
        {
          header: 'Premio',
          body: options.rewardName,
        },
      ];
    }

    try {
      const url = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${encodeURIComponent(objectId)}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        this.logger.log(
          `[Google Wallet Push] Successfully updated loyaltyObject ${objectId} (activeStamps: ${activeStamps})`,
        );
      } else if (res.status === 404) {
        this.logger.warn(
          `[Google Wallet Push] LoyaltyObject ${objectId} not found in Google Wallet (pass not yet saved by user).`,
        );
      } else {
        const errorBody = await res.text();
        this.logger.error(
          `[Google Wallet Push] Failed to patch loyaltyObject ${objectId} (${res.status}): ${errorBody}`,
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[Google Wallet Push] Unexpected error patching loyaltyObject ${objectId}: ${msg}`,
      );
    }
  }
}
