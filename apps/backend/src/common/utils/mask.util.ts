/**
 * Masks a RUT string for cashier display to protect customer privacy.
 * E.g., "12345678-5" -> "12.***.*78-5"
 */
export function maskRut(rut: string): string {
  const clean = rut.replace(/[^0-9kK]/g, '');
  if (clean.length < 3) return rut;

  const dv = clean.slice(-1).toUpperCase();
  const body = clean.slice(0, -1);

  if (body.length <= 4) {
    return `${body.slice(0, 1)}***-${dv}`;
  }

  const start = body.slice(0, 2);
  const end = body.slice(-2);
  return `${start}.***.*${end}-${dv}`;
}

/**
 * Masks a phone number for cashier display.
 * E.g., "+56912345678" -> "+56 9 **** 5678"
 */
export function maskPhone(phone: string): string {
  const clean = phone.replace(/[^0-9+]/g, '');
  if (clean.length < 8) return clean;

  const prefix = clean.startsWith('+569') ? '+56 9' : clean.slice(0, 4);
  const lastFour = clean.slice(-4);
  return `${prefix} **** ${lastFour}`;
}
