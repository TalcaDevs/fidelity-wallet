/**
 * Utilidades para limpieza, validación (Módulo 11) y formateo de RUT chileno.
 */

/**
 * Limpia el RUT quitando puntos, espacios y pasando el dígito verificador a mayúscula.
 * Retorna formato: "12345678-K" o "" si es inválido.
 */
export function cleanRut(rawRut: string): string {
  if (!rawRut || typeof rawRut !== 'string') return '';
  const cleaned = rawRut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (cleaned.length < 2) return '';

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  return `${body}-${dv}`;
}

/**
 * Valida el dígito verificador del RUT usando el algoritmo de Módulo 11.
 */
export function validateRut(rawRut: string): boolean {
  const normalized = cleanRut(rawRut);
  if (!normalized) return false;

  const [body, dv] = normalized.split('-');
  if (!body || !dv || body.length < 7 || body.length > 8) return false;

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  let expectedDv = '';
  if (remainder === 11) expectedDv = '0';
  else if (remainder === 10) expectedDv = 'K';
  else expectedDv = remainder.toString();

  return dv === expectedDv;
}

/**
 * Formatea un RUT con puntos y guion: "12.345.678-K".
 */
export function formatRut(rawRut: string): string {
  const normalized = cleanRut(rawRut);
  if (!normalized) return '';

  const [body, dv] = normalized.split('-');
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${dv}`;
}
