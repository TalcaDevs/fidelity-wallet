import {
  TICKET_ATTACHMENT_MAX_BYTES,
  TICKET_ATTACHMENT_MIME_TYPES,
  TICKET_DESCRIPTION_MIN,
  TICKET_TEXT_MAX,
} from '@fidelity/shared';

/** Países del selector de teléfono de soporte (§6.6). El primero es el valor por defecto. */
export const PHONE_COUNTRIES = [
  { code: 'CL', label: 'Chile', dial: '+56' },
  { code: 'AR', label: 'Argentina', dial: '+54' },
  { code: 'PE', label: 'Perú', dial: '+51' },
  { code: 'CO', label: 'Colombia', dial: '+57' },
  { code: 'MX', label: 'México', dial: '+52' },
  { code: 'ES', label: 'España', dial: '+34' },
  { code: 'US', label: 'Estados Unidos', dial: '+1' },
] as const;

const E164 = /^\+[1-9]\d{7,14}$/;

/** Une prefijo y número local en E.164; vacío = sin teléfono. */
export function toE164(dial: string, local: string): string | null {
  const digits = local.replace(/\D/g, '');
  if (!digits) return null;
  return `${dial}${digits}`;
}

export function isValidE164(phone: string): boolean {
  return E164.test(phone);
}

export function descriptionError(description: string): string | null {
  const length = description.trim().length;
  if (length < TICKET_DESCRIPTION_MIN) {
    return `Escribe al menos ${TICKET_DESCRIPTION_MIN} caracteres (llevas ${length})`;
  }
  if (length > TICKET_TEXT_MAX) return `El máximo es ${TICKET_TEXT_MAX} caracteres`;
  return null;
}

export function attachmentError(file: Pick<File, 'type' | 'size'>): string | null {
  if (!(TICKET_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'La captura debe ser PNG o JPG';
  }
  if (file.size > TICKET_ATTACHMENT_MAX_BYTES) return 'La captura no puede pesar más de 10 MB';
  return null;
}
