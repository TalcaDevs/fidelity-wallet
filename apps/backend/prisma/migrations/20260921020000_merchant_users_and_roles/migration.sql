-- Roles OWNER / STAFF: un comercio pasa a tener varios usuarios.
--
-- Hasta ahora "Merchant"."id" era literalmente "auth"."users"."id" y todas las politicas
-- RLS decian "merchantId" = auth.uid(). Eso funciona mientras haya exactamente un usuario
-- por comercio y se rompe el dia que el dueno invita a un mesero: el mesero tiene otro
-- uid, asi que no ve nada de su propio local. Peor todavia, el trigger handle_new_user
-- crea un "Merchant" por CADA alta en auth.users, de modo que el primer mesero invitado
-- se auto-creaba su propio local vacio.
--
-- La identidad del comercio deja de ser el uid y pasa a ser la MEMBRESIA: la tabla
-- "MerchantUser" dice que usuarios pertenecen a que comercio y con que rol.
--
-- Reparto de permisos que fija esta migracion:
--   - SELECT: cualquier miembro del comercio (OWNER o STAFF).
--   - INSERT / UPDATE / DELETE: solo OWNER.
-- El STAFF es SOLO LECTURA desde el panel a proposito. Los sellos y canjes no los escribe
-- el navegador del mesero con su token de usuario: los escribe el backend con la
-- service_role key, que omite RLS por completo. Asi un mesero con la sesion robada no
-- puede regalarse premios editando filas a mano.

-- 1. Rol y tabla de membresia.
CREATE TYPE "MerchantRole" AS ENUM ('OWNER', 'STAFF');

CREATE TABLE "MerchantUser" (
    "userId" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "role" "MerchantRole" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantUser_pkey" PRIMARY KEY ("userId", "merchantId")
);

-- La PK compuesta ya empieza por "userId", pero el indice explicito existe igual porque
-- esa es la consulta que hacen las funciones helper en CADA evaluacion de politica y no
-- conviene que dependa de como quede ordenada la PK.
CREATE INDEX "MerchantUser_userId_idx" ON "MerchantUser"("userId");

ALTER TABLE "MerchantUser" ADD CONSTRAINT "MerchantUser_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- No hay FK contra auth.users a proposito: Prisma no modela el esquema auth y una FK
-- entre esquemas quedaria como drift permanente en prisma migrate diff. La integridad de
-- "userId" la garantiza el trigger de alta.

-- 2. Backfill: hoy el dueno y el comercio comparten id, asi que cada Merchant existente
--    genera su propia membresia OWNER.
INSERT INTO "MerchantUser" ("userId", "merchantId", "role")
SELECT m."id", m."id", 'OWNER'::"MerchantRole"
FROM "Merchant" m
ON CONFLICT ("userId", "merchantId") DO NOTHING;

-- 3. Funciones helper usadas por todas las politicas.
--
--    SECURITY DEFINER no es un lujo: las politicas de "MerchantUser" necesitan consultar
--    "MerchantUser", y una politica que lee su propia tabla con los permisos del invocante
--    entra en recursion infinita de RLS. Al correr como el dueno de la funcion, la lectura
--    interna no vuelve a evaluar politicas.
--
--    SET search_path = public, pg_temp tampoco es opcional: una funcion SECURITY DEFINER
--    con search_path mutable es un vector de escalada de privilegios (el linter de Supabase
--    lo reporta como function_search_path_mutable, y ya hubo una correccion por eso en
--    20260920041500_harden_rls_and_trigger). auth.uid() va calificado con su esquema
--    justamente porque "auth" no queda en ese search_path.
--
--    STABLE permite al planner evaluarlas una vez por consulta en vez de una vez por fila.

CREATE OR REPLACE FUNCTION public.current_merchant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT mu."merchantId"
  FROM public."MerchantUser" mu
  WHERE mu."userId" = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_merchant_owner(m uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."MerchantUser" mu
    WHERE mu."userId" = auth.uid()
      AND mu."merchantId" = m
      AND mu."role" = 'OWNER'::"MerchantRole"
  );
$$;

-- 4. Fuera las politicas viejas basadas en auth.uid() directo.
--    Los DROP ... IF EXISTS (tambien de las nuevas) hacen la migracion re-ejecutable.
DROP POLICY IF EXISTS "merchant_self"     ON "Merchant";
DROP POLICY IF EXISTS "promotion_own"     ON "Promotion";
DROP POLICY IF EXISTS "pass_own"          ON "Pass";
DROP POLICY IF EXISTS "scan_own"          ON "Scan";
DROP POLICY IF EXISTS "stamp_own"         ON "Stamp";
DROP POLICY IF EXISTS "customer_via_pass" ON "Customer";

DROP POLICY IF EXISTS "merchant_select" ON "Merchant";
DROP POLICY IF EXISTS "merchant_insert" ON "Merchant";
DROP POLICY IF EXISTS "merchant_update" ON "Merchant";
DROP POLICY IF EXISTS "merchant_delete" ON "Merchant";

DROP POLICY IF EXISTS "promotion_select" ON "Promotion";
DROP POLICY IF EXISTS "promotion_insert" ON "Promotion";
DROP POLICY IF EXISTS "promotion_update" ON "Promotion";
DROP POLICY IF EXISTS "promotion_delete" ON "Promotion";

DROP POLICY IF EXISTS "pass_select" ON "Pass";
DROP POLICY IF EXISTS "pass_insert" ON "Pass";
DROP POLICY IF EXISTS "pass_update" ON "Pass";
DROP POLICY IF EXISTS "pass_delete" ON "Pass";

DROP POLICY IF EXISTS "scan_select" ON "Scan";
DROP POLICY IF EXISTS "scan_insert" ON "Scan";
DROP POLICY IF EXISTS "scan_update" ON "Scan";
DROP POLICY IF EXISTS "scan_delete" ON "Scan";

DROP POLICY IF EXISTS "stamp_select" ON "Stamp";
DROP POLICY IF EXISTS "stamp_insert" ON "Stamp";
DROP POLICY IF EXISTS "stamp_update" ON "Stamp";
DROP POLICY IF EXISTS "stamp_delete" ON "Stamp";

DROP POLICY IF EXISTS "customer_select" ON "Customer";

DROP POLICY IF EXISTS "merchant_user_select" ON "MerchantUser";
DROP POLICY IF EXISTS "merchant_user_insert" ON "MerchantUser";
DROP POLICY IF EXISTS "merchant_user_update" ON "MerchantUser";
DROP POLICY IF EXISTS "merchant_user_delete" ON "MerchantUser";

-- 5. Politicas nuevas, separadas por operacion.
--    En INSERT y UPDATE va WITH CHECK ademas de USING: USING filtra las filas que se
--    pueden tocar, WITH CHECK valida como queda la fila despues. Sin WITH CHECK en UPDATE
--    un OWNER podria mover una fila suya al comercio de otro cambiandole el "merchantId".

ALTER TABLE "MerchantUser" ENABLE ROW LEVEL SECURITY;

-- Merchant se identifica por su propia id, no por "merchantId".
CREATE POLICY "merchant_select" ON "Merchant"
  FOR SELECT USING (id IN (SELECT public.current_merchant_ids()));

CREATE POLICY "merchant_insert" ON "Merchant"
  FOR INSERT WITH CHECK (public.is_merchant_owner(id));

CREATE POLICY "merchant_update" ON "Merchant"
  FOR UPDATE USING (public.is_merchant_owner(id))
  WITH CHECK (public.is_merchant_owner(id));

CREATE POLICY "merchant_delete" ON "Merchant"
  FOR DELETE USING (public.is_merchant_owner(id));

CREATE POLICY "promotion_select" ON "Promotion"
  FOR SELECT USING ("merchantId" IN (SELECT public.current_merchant_ids()));

CREATE POLICY "promotion_insert" ON "Promotion"
  FOR INSERT WITH CHECK (public.is_merchant_owner("merchantId"));

CREATE POLICY "promotion_update" ON "Promotion"
  FOR UPDATE USING (public.is_merchant_owner("merchantId"))
  WITH CHECK (public.is_merchant_owner("merchantId"));

CREATE POLICY "promotion_delete" ON "Promotion"
  FOR DELETE USING (public.is_merchant_owner("merchantId"));

CREATE POLICY "pass_select" ON "Pass"
  FOR SELECT USING ("merchantId" IN (SELECT public.current_merchant_ids()));

CREATE POLICY "pass_insert" ON "Pass"
  FOR INSERT WITH CHECK (public.is_merchant_owner("merchantId"));

CREATE POLICY "pass_update" ON "Pass"
  FOR UPDATE USING (public.is_merchant_owner("merchantId"))
  WITH CHECK (public.is_merchant_owner("merchantId"));

CREATE POLICY "pass_delete" ON "Pass"
  FOR DELETE USING (public.is_merchant_owner("merchantId"));

CREATE POLICY "scan_select" ON "Scan"
  FOR SELECT USING ("merchantId" IN (SELECT public.current_merchant_ids()));

CREATE POLICY "scan_insert" ON "Scan"
  FOR INSERT WITH CHECK (public.is_merchant_owner("merchantId"));

CREATE POLICY "scan_update" ON "Scan"
  FOR UPDATE USING (public.is_merchant_owner("merchantId"))
  WITH CHECK (public.is_merchant_owner("merchantId"));

CREATE POLICY "scan_delete" ON "Scan"
  FOR DELETE USING (public.is_merchant_owner("merchantId"));

CREATE POLICY "stamp_select" ON "Stamp"
  FOR SELECT USING ("merchantId" IN (SELECT public.current_merchant_ids()));

CREATE POLICY "stamp_insert" ON "Stamp"
  FOR INSERT WITH CHECK (public.is_merchant_owner("merchantId"));

CREATE POLICY "stamp_update" ON "Stamp"
  FOR UPDATE USING (public.is_merchant_owner("merchantId"))
  WITH CHECK (public.is_merchant_owner("merchantId"));

CREATE POLICY "stamp_delete" ON "Stamp"
  FOR DELETE USING (public.is_merchant_owner("merchantId"));

-- Customer no pertenece a un comercio: un mismo cliente puede tener pases en varios
-- locales. Escribir clientes sigue siendo tarea del backend con service_role.
--
-- A diferencia del resto de las tablas, la lectura de Customer NO se abre a todo miembro
-- del comercio: queda restringida al OWNER. El motivo es que aca vive el dato personal
-- (RUT y telefono) y el STAFF solo necesita el SALDO DE SELLOS, que esta en "Pass" /
-- "Stamp" / "PassStampBalance" sin ningun dato identificatorio. RLS es fila a fila, no
-- columna a columna, y todos los usuarios de Supabase comparten el rol "authenticated",
-- asi que no hay forma de darle al mesero una vista parcial de esta tabla por politica:
-- o ve la fila entera o no la ve.
--
-- Consecuencia para Dev 2: el fallback del escaner por RUT/telefono NO puede resolverse
-- consultando Supabase desde la PWA con el token del mesero. Tiene que pasar por el
-- backend (service_role), que ademas es el unico lugar donde se puede enmascarar el RUT
-- antes de devolverlo a la pantalla de caja (§7.2 del HANDOFF).
CREATE POLICY "customer_select" ON "Customer"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Pass" p
      WHERE p."customerId" = "Customer".id
        AND public.is_merchant_owner(p."merchantId")
    )
  );


-- El mesero necesita leer su propia membresia para saber a que local pertenece, aunque no
-- pueda ver la lista completa del equipo; de ahi el OR con "userId" = auth.uid().
CREATE POLICY "merchant_user_select" ON "MerchantUser"
  FOR SELECT USING (
    "userId" = auth.uid()
    OR public.is_merchant_owner("merchantId")
  );

CREATE POLICY "merchant_user_insert" ON "MerchantUser"
  FOR INSERT WITH CHECK (public.is_merchant_owner("merchantId"));

CREATE POLICY "merchant_user_update" ON "MerchantUser"
  FOR UPDATE USING (public.is_merchant_owner("merchantId"))
  WITH CHECK (public.is_merchant_owner("merchantId"));

CREATE POLICY "merchant_user_delete" ON "MerchantUser"
  FOR DELETE USING (public.is_merchant_owner("merchantId"));

-- Supabase concede privilegios a anon/authenticated/service_role por default privileges,
-- pero se explicita para la tabla nueva. El IF evita romper en una base que no sea
-- Supabase (esos roles no existen).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public."MerchantUser" TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT ALL ON public."MerchantUser" TO service_role';
  END IF;
END
$$;

-- 6. El trigger de alta deja de crear un local por cada usuario.
--    Si el alta trae raw_user_meta_data->>'merchant_id' es un mesero invitado: solo se le
--    crea la membresia. Sin ese dato es un dueno que se registra solo: se le crea el
--    Merchant como antes MAS su membresia OWNER.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_merchant_id uuid;
  v_role "MerchantRole";
BEGIN
  v_merchant_id := NULLIF(new.raw_user_meta_data ->> 'merchant_id', '')::uuid;

  IF v_merchant_id IS NOT NULL THEN
    -- Mesero invitado. El rol viene en la metadata, pero NO se castea a ciegas: un valor
    -- basura ahi haria fallar el alta entera con un error de enum. Cualquier cosa que no
    -- sea OWNER cae a STAFF, que es el rol menos privilegiado.
    v_role := (CASE upper(COALESCE(NULLIF(new.raw_user_meta_data ->> 'role', ''), 'STAFF'))
                 WHEN 'OWNER' THEN 'OWNER'
                 ELSE 'STAFF'
               END)::"MerchantRole";

    INSERT INTO public."MerchantUser" ("userId", "merchantId", "role")
    VALUES (new.id, v_merchant_id, v_role)
    ON CONFLICT ("userId", "merchantId") DO NOTHING;
  ELSE
    -- Dueno nuevo. Se conserva que Merchant.id = auth.users.id para no invalidar los datos
    -- existentes, pero eso ya no es lo que autoriza nada: autoriza la fila de membresia.
    INSERT INTO public."Merchant" (id, email, name)
    VALUES (new.id, new.email, 'Mi Local (' || split_part(new.email, '@', 1) || ')');

    INSERT INTO public."MerchantUser" ("userId", "merchantId", "role")
    VALUES (new.id, new.id, 'OWNER'::"MerchantRole")
    ON CONFLICT ("userId", "merchantId") DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Se recrea el trigger para que la migracion sea autosuficiente si se aplica sobre una
-- base donde el trigger se hubiera perdido.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
