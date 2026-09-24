import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassData } from '../interfaces/pass-data.interface.js';

@Injectable()
export class ApplePassService {
  private readonly logger = new Logger(ApplePassService.name);

  constructor(private readonly configService: ConfigService) {}

  public hasRealCertificates(): boolean {
    const cert = this.configService.get<string>('APPLE_PASS_CERT') || process.env.APPLE_PASS_CERT;
    const key = this.configService.get<string>('APPLE_PASS_KEY') || process.env.APPLE_PASS_KEY;
    const wwdr = this.configService.get<string>('APPLE_WWDR_CERT') || process.env.APPLE_WWDR_CERT;
    return Boolean(cert && key && wwdr);
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

    return {
      formatVersion: 1,
      passTypeIdentifier,
      serialNumber: data.serialNumber,
      teamIdentifier,
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
            value: `Acumula ${data.targetStamps} sellos en ${data.merchantName} y canjea tu "${data.rewardName}". Tus sellos vigentes también sirven para cualquier otra promoción activa del local: eliges en caja cuál canjear.`,
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

        if (!cert || !key || !wwdr) {
          throw new Error('Certificados de firma de Apple incompletos (APPLE_PASS_CERT, APPLE_PASS_KEY y APPLE_WWDR_CERT son requeridos)');
        }

        const certificates = {
          signerCert: cert,
          signerKey: key,
          wwdr,
          ...(password ? { signerKeyPassphrase: password } : {}),
        };

        const transparentIcon = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64',
        );
        const pass = new PKPass({ 'icon.png': transparentIcon }, certificates, passJson);
        return pass.getAsBuffer();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Fallo al firmar PKPass: ${msg}`);
        const allowMock = this.configService.get<string>('ALLOW_MOCK_PASSES') === 'true';

        if (!allowMock) {
          throw new InternalServerErrorException('Fallo en la firma del pase Apple Wallet');
        }
        this.logger.warn('Utilizando buffer mock en modo de desarrollo.');
      }
    } else {
      const allowMock = this.configService.get<string>('ALLOW_MOCK_PASSES') === 'true';

      if (!allowMock) {
        throw new InternalServerErrorException(
          'Los certificados de firma de Apple Wallet no están configurados',
        );
      }
    }

    // Mock fallback para desarrollo: serializar JSON del manifiesto del pase
    return Buffer.from(JSON.stringify(passJson, null, 2), 'utf-8');
  }
}
