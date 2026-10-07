-- Los premios y la configuración de tarjeta se escriben por la API para aplicar cupos,
-- monedas, permisos, auditoría y locks. Las lecturas directas siguen protegidas por RLS.
-- Revocar el UPDATE de tabla no elimina grants por columna: quitar también los legacy.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE INSERT, UPDATE, DELETE ON public."Promotion", public."LoyaltyProgram" FROM authenticated;
    REVOKE UPDATE (name, "stampValidityDays") ON public."LoyaltyProgram" FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE INSERT, UPDATE, DELETE ON public."Promotion", public."LoyaltyProgram" FROM anon;
    REVOKE UPDATE (name, "stampValidityDays") ON public."LoyaltyProgram" FROM anon;
  END IF;
END
$$;
