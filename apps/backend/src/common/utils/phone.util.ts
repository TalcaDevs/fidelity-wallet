/**
 * Utilidad pura de normalización y validación de teléfonos móviles chilenos.
 * Desacoplada de NestJS y capas HTTP.
 */

/**
 * Normaliza teléfonos al formato estándar internacional chileno (+569XXXXXXXX).
 * Retorna null si el formato no corresponde a un móvil chileno válido.
 *
 * Formatos aceptados:
 * - 9 dígitos iniciando en 9 (ej. 912345678 -> +56912345678)
 * - 11 dígitos iniciando en 569 (ej. 56912345678 -> +56912345678)
 * - Con prefijo +569 (ej. +56912345678 -> +56912345678)
 */
export function normalizePhone(rawPhone: string): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null;
  const digits = rawPhone.replace(/\D/g, '');

  // 9 dígitos iniciando en 9 (ej. 912345678)
  if (digits.length === 9 && digits.startsWith('9')) {
    return `+56${digits}`;
  }

  // 11 dígitos iniciando en 569 (ej. 56912345678)
  if (digits.length === 11 && digits.startsWith('569')) {
    return `+${digits}`;
  }

  return null;
}
