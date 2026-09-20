-- Endurece la seguridad de la base:
--   1. Fija el search_path de handle_new_user (SECURITY DEFINER sin search_path es
--      un vector de escalada de privilegios; el linter de Supabase lo marca como
--      function_search_path_mutable).
--   2. Recrea el trigger de forma incondicional. La migración anterior lo envolvía
--      en un IF EXISTS sobre el esquema 'auth', de modo que pasaba en verde sin
--      crear nada. Si el esquema auth no está, esta migración debe fallar.
--   3. Activa Row Level Security en las cinco tablas y define las políticas.
--
-- Requiere una base Supabase (esquema 'auth' con auth.uid()). El backend usa la
-- service_role key, que omite RLS, por lo que no se ve afectado.

-- 1. Función del trigger con search_path fijo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."Merchant" (id, email, name)
  VALUES (new.id, new.email, 'Mi Local (' || split_part(new.email, '@', 1) || ')');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Trigger incondicional
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Row Level Security
ALTER TABLE "Merchant"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Promotion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pass"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Scan"      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "merchant_self"      ON "Merchant";
DROP POLICY IF EXISTS "promotion_own"      ON "Promotion";
DROP POLICY IF EXISTS "pass_own"           ON "Pass";
DROP POLICY IF EXISTS "scan_own"           ON "Scan";
DROP POLICY IF EXISTS "customer_via_pass"  ON "Customer";

-- El trigger hace que Merchant.id sea el mismo UUID que auth.users.id,
-- así que auth.uid() identifica directamente al comercio.
CREATE POLICY "merchant_self" ON "Merchant"
  FOR ALL USING (id = auth.uid());

CREATE POLICY "promotion_own" ON "Promotion"
  FOR ALL USING ("merchantId" = auth.uid());

CREATE POLICY "pass_own" ON "Pass"
  FOR ALL USING ("merchantId" = auth.uid());

CREATE POLICY "scan_own" ON "Scan"
  FOR ALL USING ("merchantId" = auth.uid());

-- Customer no pertenece a un comercio: un mismo cliente puede tener pases en
-- varios locales. El comercio solo puede leer los clientes que tienen un pase
-- suyo. Escribir clientes es tarea del backend (service_role).
CREATE POLICY "customer_via_pass" ON "Customer"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Pass" p
      WHERE p."customerId" = "Customer".id
        AND p."merchantId" = auth.uid()
    )
  );
