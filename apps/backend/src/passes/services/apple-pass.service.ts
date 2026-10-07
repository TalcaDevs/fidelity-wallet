import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { balanceUnit, linkUri } from '@fidelity/shared';
import type { PassData } from '../interfaces/pass-data.interface.js';
import { statusText } from './google-wallet-payloads.js';

/** Apple Wallet pide los colores como rgb(r, g, b). */
function rgb(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

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

    const { card } = data.cardClass;
    const unit = balanceUnit(card.stampsEnabled ? 'STAMPS' : 'POINTS');
    const { details } = card;
    const backFields = [
      ...details.sections.map((section, i) => ({
        key: `section_${i}`,
        label: section.header.toUpperCase(),
        value: section.body,
      })),
      ...details.links.map((link, i) => ({
        key: `link_${i}`,
        label: link.label.toUpperCase(),
        value: linkUri(link),
      })),
      {
        key: 'expiryInfo',
        label: 'VIGENCIA',
        value: data.nextExpiryAt
          ? `Próximo vencimiento: ${data.nextExpiryAt.toLocaleDateString('es-CL')}`
          : (data.stampsEnabled && data.pointsEnabled ? 'Tus sellos y puntos no vencen.' : `Tus ${unit} no vencen.`),
      },
    ];

    return {
      formatVersion: 1,
      passTypeIdentifier,
      serialNumber: data.serialNumber,
      teamIdentifier,
      organizationName: data.merchantName,
      description: `${card.name} - ${data.merchantName}`,
      logoText: card.design.wideLogoUrl ? undefined : card.name,
      foregroundColor: rgb(card.design.textColor),
      backgroundColor: rgb(card.design.backgroundColor),
      labelColor: rgb(card.design.labelColor),
      ...(data.cardExpiresAt ? { expirationDate: data.cardExpiresAt.toISOString() } : {}),
      storeCard: {
        headerFields: [
          ...(data.stampsEnabled
            ? [
                {
                  key: 'stamps',
                  label: 'SELLOS',
                  value: data.rewardCurrency === 'STAMPS' && data.targetStamps > 0 ? `${data.activeStamps} / ${data.targetStamps}` : String(data.activeStamps),
                },
              ]
            : []),
          ...(data.pointsEnabled
            ? [
                {
                  key: 'points',
                  label: 'PUNTOS',
                  value: data.rewardCurrency === 'POINTS' && data.targetStamps > 0 ? `${data.activePoints} / ${data.targetStamps}` : String(data.activePoints),
                },
              ]
            : []),
        ],
        primaryFields: details.fields.includes('REWARD')
          ? [{ key: 'reward', label: 'PREMIO', value: data.rewardName }]
          : [],
        secondaryFields: [
          ...(details.showCustomerName
            ? [{ key: 'customer', label: 'TITULAR', value: data.customerLabel }]
            : []),
          ...(details.fields.includes('PROGRESS')
            ? [{ key: 'status', label: 'ESTADO', value: statusText(card, data.rewardCurrency === 'POINTS' ? data.activePoints : data.activeStamps, data.targetStamps, data.rewardCurrency) }]
            : []),
        ],
        backFields,
      },
      barcodes: [
        {
          format: 'PKBarcodeFormatQR',
          message: data.passToken,
          messageEncoding: 'iso-8859-1',
          ...(details.showCustomerName ? { altText: data.customerLabel } : {}),
        },
      ],
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
