import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Envía un código OTP por SMS al número telefónico indicado.
   * En entorno local o sin credenciales de proveedor SMS (Twilio / AWS SNS),
   * opera en modo MOCK registrando el código en los logs del servidor.
   */
  async sendRecoveryCode(
    phone: string,
    code: string,
    merchantName: string,
  ): Promise<boolean> {
    const isMock =
      this.configService.get<string>('SMS_MOCK', 'true') === 'true' ||
      !this.configService.get<string>('TWILIO_ACCOUNT_SID');

    const message = `Tu código de recuperación para ${merchantName} es: ${code}. Válido por 10 minutos.`;

    if (isMock) {
      this.logger.log(`[SMS OTP MOCK] Destinatario: ${phone} | Mensaje: "${message}"`);
      return true;
    }

    // Punto de integración para proveedor real (Twilio, AWS SNS, Infobip, etc.)
    this.logger.warn(`Proveedor de SMS real no configurado. Código registrado: ${code}`);
    return true;
  }

  /**
   * Envía un código OTP por SMS para confirmar la eliminación de datos personales (Ley 19.628).
   */
  async sendDeletionCode(
    phone: string,
    code: string,
    merchantName: string,
  ): Promise<boolean> {
    const isMock =
      this.configService.get<string>('SMS_MOCK', 'true') === 'true' ||
      !this.configService.get<string>('TWILIO_ACCOUNT_SID');

    const message = `Tu código para confirmar la eliminación definitiva de tus datos en ${merchantName} es: ${code}. Válido por 10 minutos. Esta acción es irreversible.`;

    if (isMock) {
      this.logger.log(`[SMS OTP MOCK - DELETION] Destinatario: ${phone} | Mensaje: "${message}"`);
      return true;
    }

    this.logger.warn(`Proveedor de SMS real no configurado. Código registrado: ${code}`);
    return true;
  }
}
