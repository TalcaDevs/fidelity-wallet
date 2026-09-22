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
    const classId = `${issuerId}.fidelity_${data.merchantId.replace(/-/g, '_')}`;

    const claims = {
      iss:
        this.configService.get<string>('GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL') ||
        process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL ||
        'service-account@fidelity-wallet.iam.gserviceaccount.com',
      aud: 'google',
      origins: ['https://fidelitywallet.cl'],
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

  async updateLoyaltyObject(passId: string, _activeStamps: number): Promise<void> {
    this.logger.log(
      `[Google Wallet API Mock/Push] Dispatching loyaltyObject patch update for passId: ${passId}`,
    );
  }
}
