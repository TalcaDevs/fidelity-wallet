export const CHILE_TIME_ZONE = 'America/Santiago';

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: CHILE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "2026-10-03": el día calendario en Chile, que no es el de UTC. */
export function chileDay(date: Date): string {
  return dayFormat.format(date);
}

/** Medianoche de Chile siguiente a `date`, en UTC. */
export function nextChileMidnight(date: Date): Date {
  const [y, m, d] = chileDay(date).split('-').map(Number);
  const asUtc = Date.UTC(y, m - 1, d + 1);
  // El desfase de Chile cambia con el horario de verano: se mide en la medianoche misma.
  const offsetMs = (probe: number) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: CHILE_TIME_ZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(probe));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const local = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    return local - probe;
  };
  return new Date(asUtc - offsetMs(asUtc - offsetMs(asUtc)));
}
