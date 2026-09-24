-- Migración: customer_terms_acceptance
-- El alta del cliente final exige RUT + teléfono y la aceptación de los términos y condiciones.
-- Se guarda cuándo y qué versión aceptó, para poder demostrar el consentimiento (Ley 19.628).
-- Ambas columnas son nullables: los clientes registrados antes de este cambio no las tienen.
-- rut y phone siguen siendo nullables en la BD por la misma razón; la obligatoriedad de ambos
-- la aplica la API (POST /api/customers).

ALTER TABLE "Customer" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "termsVersion" TEXT;
