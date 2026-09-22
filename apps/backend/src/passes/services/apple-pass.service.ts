import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassData } from '../interfaces/pass-data.interface.js';

@Injectable()
export class ApplePassService {
  private readonly logger = new Logger(ApplePassService.name);

  constructor(private readonly configService: ConfigService) {}

  public hasRealCertificates(): boolean {
    const cert = this.configService.get<string>('APPLE_PASS_CERT') || process.env.APPLE_PASS_CERT;
    const key = this.configService.get<string>('APPLE_PASS_KEY') || process.env.APPLE_PASS_KEY;
    return Boolean(cert && key);
  }

  public getPassUrl(passToken: string): string {
    const backendUrl =
      this.configService.get<string>('BACKEND_URL') ||
      process.env.BACKEND_URL ||
      'http://localhost:3000';
    return `${backendUrl}/api/passes/${passToken}/apple`;
  }

  public buildPassJson(data: PassData): Record<string, unknown> {
    const passTypeIdentifier =
      this.configService.get<string>('APPLE_PASS_TYPE_IDENTIFIER') ||
      process.env.APPLE_PASS_TYPE_IDENTIFIER ||
      'pass.com.talcadevs.fidelity';

    const teamIdentifier =
      this.configService.get<string>('APPLE_TEAM_IDENTIFIER') ||
      process.env.APPLE_TEAM_IDENTIFIER ||
      'TALCADEVS1';

    const webServiceUrl =
      this.configService.get<string>('BACKEND_URL') ||
      process.env.BACKEND_URL ||
      'http://localhost:3000';

    return {
      formatVersion: 1,
      passTypeIdentifier,
      serialNumber: data.serialNumber,
      teamIdentifier,
      webServiceURL: `${webServiceUrl}/v1`,
      authenticationToken: data.passToken,
      organizationName: data.merchantName,
      description: `Pase de Fidelidad - ${data.merchantName}`,
      foregroundColor: data.foregroundColor || 'rgb(255, 255, 255)',
      backgroundColor: data.backgroundColor || 'rgb(30, 41, 59)',
      labelColor: data.labelColor || 'rgb(148, 163, 184)',
      storeCard: {
        headerFields: [
          {
            key: 'stamps',
            label: 'SELLOS',
            value: `${data.activeStamps} / ${data.targetStamps}`,
          },
        ],
        primaryFields: [
          {
            key: 'reward',
            label: 'PREMIO',
            value: data.rewardName,
          },
        ],
        secondaryFields: [
          {
            key: 'customer',
            label: 'CLIENTE',
            value: data.customerLabel,
          },
          {
            key: 'status',
            label: 'ESTADO',
            value:
              data.activeStamps >= data.targetStamps
                ? '¡Premio desbloqueado!'
                : `Faltan ${data.targetStamps - data.activeStamps} sellos`,
          },
        ],
        backFields: [
          {
            key: 'terms',
            label: 'TÉRMINOS Y CONDICIONES',
            value: `Acumula ${data.targetStamps} sellos en ${data.merchantName} y canjea tu "${data.rewardName}".`,
          },
          {
            key: 'expiryInfo',
            label: 'VIGENCIA',
            value: data.nextExpiryAt
              ? `Próximo vencimiento: ${data.nextExpiryAt.toLocaleDateString('es-CL')}`
              : 'Tus sellos no vencen.',
          },
        ],
      },
      barcodes: [
        {
          format: 'PKBarcodeFormatQR',
          message: data.passToken,
          messageEncoding: 'iso-8859-1',
          altText: data.customerLabel,
        },
      ],
      barcode: {
        format: 'PKBarcodeFormatQR',
        message: data.passToken,
        messageEncoding: 'iso-8859-1',
        altText: data.customerLabel,
      },
    };
  }

  async generatePassBuffer(data: PassData): Promise<Buffer> {
    const passJson = this.buildPassJson(data);

    if (this.hasRealCertificates()) {
      try {
        const { PKPass } = await import('passkit-generator');
        const cert = this.configService.get<string>('APPLE_PASS_CERT') || process.env.APPLE_PASS_CERT;
        const key = this.configService.get<string>('APPLE_PASS_KEY') || process.env.APPLE_PASS_KEY;
        const wwdr = this.configService.get<string>('APPLE_WWDR_CERT') || process.env.APPLE_WWDR_CERT;
        const password =
          this.configService.get<string>('APPLE_PASS_PASSWORD') ||
          process.env.APPLE_PASS_PASSWORD;

        const certificates: Record<string, unknown> = {
          signerCert: cert!,
          signerKey: key!,
        };
        if (password) certificates.signerKeyPassphrase = password;
        if (wwdr) certificates.wwdr = wwdr;

        const pass = new PKPass({}, certificates as any, passJson as any);

        return pass.getAsBuffer();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Failed to sign PKPass with real certificates (${msg}). Falling back to development mock pass buffer.`,
        );
      }
    }

    // Development / Mock fallback: serialize pass manifest JSON as buffer
    return Buffer.from(JSON.stringify(passJson, null, 2), 'utf-8');
  }

  async sendApnsPush(pushToken: string): Promise<void> {
    this.logger.log(`[APNs Mock/Push] Dispatching pass update push notification to device token: ${pushToken}`);
    // In production with APNs credentials, http2 connection to api.push.apple.com sends empty payload {}
  }
}
