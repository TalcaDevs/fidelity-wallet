// Umbral en días hasta el que mostramos el vencimiento en términos relativos
// ("vence en 5 días"). Más allá, una fecha concreta le dice más al dueño que un
// número grande de días.
const RELATIVE_DAYS_THRESHOLD = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Comparamos días de calendario, no milisegundos: un sello que vence esta noche
// y otro que vence mañana a primera hora están a "0" y "1" día, aunque los
// separen pocas horas. Es lo que espera quien lee la tabla.
function diffInCalendarDays(target: Date, from: Date): number {
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  return Math.round((targetDay - fromDay) / MS_PER_DAY);
}

function toDayMonth(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Texto en español del próximo vencimiento de sellos.
 * Devuelve null cuando no hay vencimiento (o la fecha es inválida) para que
 * quien lo pinte simplemente no muestre nada, en vez de un guion o un "null".
 * "Ahora" se recibe por parámetro: así la función es pura y testeable.
 */
export function formatStampExpiry(expiresAt: string | null | undefined, now: Date): string | null {
  if (!expiresAt) return null;

  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return null;

  const days = diffInCalendarDays(expiry, now);

  if (days < 0) return 'Vencido';
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  if (days <= RELATIVE_DAYS_THRESHOLD) return `Vence en ${days} días`;
  return `Vence el ${toDayMonth(expiry)}`;
}

/**
 * La vigencia se guarda en días. null significa "los sellos no vencen"; si hay
 * número, tiene que ser un entero positivo (0 días dejaría el sello vencido en
 * el mismo instante en que se entrega).
 */
export function isValidStampValidityDays(value: number | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  return Number.isInteger(value) && value > 0;
}
