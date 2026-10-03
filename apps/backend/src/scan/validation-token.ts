import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScanMethod } from '@prisma/client';

export const VALIDATION_TOKEN_TTL_MS = 10 * 60 * 1000;
export const VALIDATION_EXPIRED_MESSAGE =
  'La validación venció. Vuelve a escanear al cliente.';

export interface ValidationClaims {
  passId: string;
  method: ScanMethod;
  userId: string;
  merchantId: string;
}

interface TokenPayload {
  p: string;
  m: ScanMethod;
  u: string;
  l: string;
  exp: number;
}

/**
 * Comprobante de que el pase se validó en caja (QR o búsqueda manual) antes de sumar el sello o
 * canjear. Así "Agregar sello" no repite la búsqueda manual (que tiene límite por minuto), el
 * método QR/MANUAL queda auditado tal como ocurrió y el passToken del QR no viaja a la caja.
 *
 * Va atado al usuario y al local: no sirve en otra sesión ni en otro local. Sin
 * SCAN_VALIDATION_SECRET la clave se genera al arrancar, y los comprobantes vigentes mueren con
 * un reinicio (basta con volver a escanear). Con varias instancias del backend hay que definirla.
 */
@Injectable()
export class ScanValidationTokens {
  private readonly secret: Buffer;

  constructor(configService: ConfigService) {
    const configured = configService.get<string>('SCAN_VALIDATION_SECRET')?.trim();
    this.secret = configured ? Buffer.from(configured) : randomBytes(32);
  }

  sign(claims: ValidationClaims, now = Date.now()): { token: string; expiresAt: Date } {
    const exp = now + VALIDATION_TOKEN_TTL_MS;
    const payload: TokenPayload = {
      p: claims.passId,
      m: claims.method,
      u: claims.userId,
      l: claims.merchantId,
      exp,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return { token: `${body}.${this.mac(body)}`, expiresAt: new Date(exp) };
  }

  /** Lanza 400 si el comprobante es inválido, venció o es de otro usuario o local. */
  verify(
    token: string,
    expected: { userId: string; merchantId: string },
    now = Date.now(),
  ): ValidationClaims {
    const [body, mac] = token.split('.');
    if (!body || !mac || !this.sameMac(mac, this.mac(body))) {
      throw new BadRequestException(VALIDATION_EXPIRED_MESSAGE);
    }

    let payload: TokenPayload;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    } catch {
      throw new BadRequestException(VALIDATION_EXPIRED_MESSAGE);
    }

    if (
      payload.exp <= now ||
      payload.u !== expected.userId ||
      payload.l !== expected.merchantId
    ) {
      throw new BadRequestException(VALIDATION_EXPIRED_MESSAGE);
    }

    return { passId: payload.p, method: payload.m, userId: payload.u, merchantId: payload.l };
  }

  private mac(body: string): string {
    return createHmac('sha256', this.secret).update(body).digest('base64url');
  }

  private sameMac(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
