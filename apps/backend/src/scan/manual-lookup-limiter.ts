import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

export const MANUAL_LOOKUP_LIMIT = 10;
export const MANUAL_LOOKUP_WINDOW_MS = 60 * 1000;

/**
 * Límite de búsquedas manuales (RUT / teléfono) por usuario del local.
 *
 * El ingreso manual responde si un RUT o teléfono es cliente del local (y sus últimos
 * dígitos), así que sin límite sirve de oráculo para recorrer RUTs. /api/scan lleva
 * @SkipThrottle porque el escaneo por QR en hora punta no puede frenarse; este límite aplica
 * solo al camino manual y por usuario (no por IP: toda la caja puede compartir una IP).
 *
 * En memoria y por instancia: suficiente para el MVP con una sola instancia del backend. Con
 * varias instancias habría que moverlo a un store compartido (Redis).
 */
@Injectable()
export class ManualLookupLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit = MANUAL_LOOKUP_LIMIT,
    private readonly windowMs = MANUAL_LOOKUP_WINDOW_MS,
  ) {}

  /** Registra una búsqueda; lanza 429 si el usuario superó el límite de la ventana. */
  consume(userId: string, now = Date.now()): void {
    const recent = (this.hits.get(userId) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(userId, recent);
      throw new HttpException(
        'Demasiadas búsquedas manuales seguidas. Espera un minuto o escanea el QR del cliente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(userId, recent);
  }
}
