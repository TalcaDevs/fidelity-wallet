export const validateRUT = (rut: string): boolean => {
  const clean = rut.replace(/[.\-\s]/g, '');
  // Cuerpo de 7 u 8 dígitos + dígito verificador: el mismo rango que acepta el backend.
  if (!/^[0-9]{7,8}[0-9kK]$/.test(clean)) return false;

  const num = clean.slice(0, -1);
  if (parseInt(num, 10) === 0) return false;

  const dv = clean.slice(-1).toLowerCase();

  let M = 0, S = 1;
  let T = parseInt(num, 10);
  for (; T; T = Math.floor(T / 10)) {
    S = (S + (T % 10) * (9 - (M++ % 6))) % 11;
  }
  const calcDv = (S ? S - 1 : 'k').toString();
  return calcDv === dv;
};

export const isPhone = (val: string): boolean => {
  const cleanPhone = val.replace(/[\s+]/g, '');
  return /^(569|9)\d{8}$/.test(cleanPhone);
};

const RUT_MAX_CHARS = 9; // 8 dígitos de cuerpo + dígito verificador

/**
 * Formatea un RUT mientras se escribe: "123456785" → "12.345.678-5".
 * Solo deja dígitos y una K, y la K solo como dígito verificador (último carácter).
 */
export const formatRutInput = (raw: string): string => {
  let clean = raw.replace(/[^0-9kK]/g, '').toUpperCase();
  // Una K en medio es un error de tipeo: se descarta, salvo la del final.
  clean = clean.slice(0, -1).replace(/K/g, '') + clean.slice(-1);
  clean = clean.slice(0, RUT_MAX_CHARS);
  if (clean.length <= 1) return clean;

  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${clean.slice(-1)}`;
};

/** Cantidad de caracteres significativos de un RUT (sin puntos ni guion). */
export const rutLength = (rut: string): number => rut.replace(/[^0-9kK]/g, '').length;

export const PHONE_PREFIX = '+56';
const PHONE_LOCAL_DIGITS = 9; // móvil chileno: 9XXXXXXXX

/**
 * Deja solo los 9 dígitos locales del móvil. Acepta pegar el número completo
 * ("+56 9 1234 5678" o "56912345678"): el prefijo +56 lo pone la UI, no el usuario.
 */
export const phoneLocalDigits = (raw: string): string => {
  let digits = raw.replace(/\D/g, '');
  if (digits.length > PHONE_LOCAL_DIGITS && digits.startsWith('56')) {
    digits = digits.slice(2);
  }
  return digits.slice(0, PHONE_LOCAL_DIGITS);
};

/** "912345678" → "9 1234 5678" (solo visual; el valor enviado no lleva espacios). */
export const formatPhoneLocal = (digits: string): string =>
  [digits.slice(0, 1), digits.slice(1, 5), digits.slice(5, 9)].filter(Boolean).join(' ');

export const isValidPhoneLocal = (digits: string): boolean => /^9\d{8}$/.test(digits);

/** Número completo en el formato que espera el backend: +569XXXXXXXX. */
export const toFullPhone = (digits: string): string => `${PHONE_PREFIX}${digits}`;
