import { CUSTOMER_EMAIL_MAX } from '@fidelity/shared';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minúsculas y sin espacios, o null si no parece un correo. */
export function normalizeEmail(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length > CUSTOMER_EMAIL_MAX || !EMAIL_PATTERN.test(email)) return null;
  return email;
}
