import { BadRequestException } from '@nestjs/common';

/**
 * Valida si un número telefónico corresponde a un teléfono móvil chileno (+569XXXXXXXX o 9XXXXXXXX).
 */
export function isValidChileanPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) return true;
  if (digits.length === 11 && digits.startsWith('569')) return true;
  return false;
}

/**
 * Normaliza teléfonos al formato estándar internacional chileno (+569XXXXXXXX).
 * Lanza BadRequestException si el formato es inválido.
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  const digits = rawPhone.replace(/\D/g, '');

  // 9 dígitos iniciando en 9 (ej. 912345678)
  if (digits.length === 9 && digits.startsWith('9')) {
    return `+56${digits}`;
  }

  // 11 dígitos iniciando en 569 (ej. 56912345678)
  if (digits.length === 11 && digits.startsWith('569')) {
    return `+${digits}`;
  }

  throw new BadRequestException(
    `Formato de teléfono chileno inválido: "${rawPhone}". Se espera formato +569XXXXXXXX o 9XXXXXXXX.`,
  );
}
