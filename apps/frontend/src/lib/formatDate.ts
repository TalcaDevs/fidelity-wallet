const LOCALE = 'es-CL';

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** "14 de febrero" o "14 de febrero de 1990": el año del cumpleaños es opcional. */
export function formatBirthday(day: number | null | undefined, month: number | null | undefined, year?: number | null): string | null {
  if (!day || !month) return null;
  return `${day} de ${MONTHS[month - 1]}${year ? ` de ${year}` : ''}`;
}
