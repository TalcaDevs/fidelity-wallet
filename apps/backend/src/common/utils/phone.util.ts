/**
 * Normaliza teléfonos al formato estándar internacional (+569XXXXXXXX).
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  const digits = rawPhone.replace(/\D/g, '');

  // Si tiene 9 dígitos (ej. 912345678)
  if (digits.length === 9) {
    return `+56${digits}`;
  }

  // Si tiene 11 dígitos iniciando en 56 (ej. 56912345678)
  if (digits.length === 11 && digits.startsWith('56')) {
    return `+${digits}`;
  }

  return rawPhone.trim();
}
