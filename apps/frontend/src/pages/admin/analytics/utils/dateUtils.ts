export type PeriodPreset = '7d' | '30d' | 'this_month';

/**
 * Formatea un objeto Date a formato 'YYYY-MM-DD' utilizando la fecha local del navegador
 * para evitar el desfase de día que introduce Date.toISOString() en horarios nocturnos (ej. UTC-3).
 */
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la zona horaria del cliente o navegador de forma segura con fallback a 'America/Santiago'.
 */
export function getClientTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Santiago';
  } catch {
    return 'America/Santiago';
  }
}

/**
 * Calcula el rango de fechas [from, to] para un preset determinado en base a la fecha local.
 */
export function computeDateRange(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date();
  const to = formatLocalDate(now);
  let fromDate: Date;

  if (preset === '7d') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  } else if (preset === 'this_month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    // '30d' por defecto
    fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  }

  return {
    from: formatLocalDate(fromDate),
    to,
  };
}
