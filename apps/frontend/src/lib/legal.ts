/**
 * Datos legales de los términos y condiciones (/terminos).
 *
 * TERMS_VERSION se guarda en Customer.termsVersion cuando el cliente acepta. Si cambia el texto
 * de los términos, subirla aquí y en apps/backend/src/customers/terms.ts en el mismo PR:
 * Terms.test.tsx falla si no coinciden.
 */
export const TERMS_VERSION = '2026-09-24';

const env = import.meta.env;

export const LEGAL = {
  platform: 'Fidelity Wallet',
  company: env.VITE_LEGAL_COMPANY || '[RAZÓN SOCIAL DE LA EMPRESA]',
  companyRut: env.VITE_LEGAL_COMPANY_RUT || '[RUT DE LA EMPRESA]',
  address: env.VITE_LEGAL_ADDRESS || '[DOMICILIO LEGAL]',
  contactEmail: env.VITE_LEGAL_CONTACT_EMAIL || '[CORREO DE CONTACTO]',
};

/** Verdadero mientras quede algún dato legal sin definir (se muestra como "[...]"). */
export const LEGAL_IS_DRAFT = Object.values(LEGAL).some((value) => value.startsWith('['));
