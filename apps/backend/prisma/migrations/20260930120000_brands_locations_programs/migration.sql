-- Brand > Location + LoyaltyProgram (HANDOFF decisiones 5 a 8).
-- "Merchant" conserva su nombre y pasa a ser un local; cada Merchant existente se convierte en
-- una Brand con el mismo id, un solo local y un programa STAMPS con su vigencia.

-- ---------------------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------------------
CREATE TYPE "BrandStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "ProgramType" AS ENUM ('STAMPS');
CREATE TYPE "ProgramScope" AS ENUM ('BRAND', 'LOCATION');
CREATE TYPE "PlatformRole" AS ENUM ('SUPERADMIN', 'SUPPORT');
CREATE TYPE "AuditActorType" AS ENUM ('PLATFORM', 'OWNER');

-- ---------------------------------------------------------------------------------------
-- 2. Tablas nuevas
-- ---------------------------------------------------------------------------------------
CREATE TABLE "Brand" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxId" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "status" "BrandStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoyaltyProgram" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brandId" UUID NOT NULL,
    "type" "ProgramType" NOT NULL DEFAULT 'STAMPS',
    "scope" "ProgramScope" NOT NULL DEFAULT 'BRAND',
    "name" TEXT NOT NULL,
    "stampValidityDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandMember" (
    "userId" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "role" "MerchantRole" NOT NULL DEFAULT 'STAFF',
    "merchantId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandMember_pkey" PRIMARY KEY ("userId", "brandId"),
    CONSTRAINT "BrandMember_role_location_check" CHECK (
      ("role" = 'OWNER' AND "merchantId" IS NULL)
      OR ("role" = 'STAFF' AND "merchantId" IS NOT NULL)
    )
);

CREATE TABLE "PlatformAdmin" (
    "userId" UUID NOT NULL,
    "role" "PlatformRole" NOT NULL DEFAULT 'SUPPORT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorUserId" UUID NOT NULL,
    "actorType" "AuditActorType" NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------------------
-- 3. Backfill de marcas y programas
-- ---------------------------------------------------------------------------------------
INSERT INTO "Brand" ("id", "name", "contactEmail", "createdAt")
SELECT m."id", m."name", m."email", m."createdAt"
FROM "Merchant" m;

INSERT INTO "LoyaltyProgram" ("brandId", "name", "stampValidityDays", "createdAt")
SELECT m."id", 'Tarjeta de sellos', m."stampValidityDays", m."createdAt"
FROM "Merchant" m;

-- ---------------------------------------------------------------------------------------
-- 4. Merchant pasa a ser un local de una marca
-- ---------------------------------------------------------------------------------------
ALTER TABLE "Merchant"
  ADD COLUMN "brandId" UUID,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "commune" TEXT,
  ADD COLUMN "region" TEXT,
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Merchant" SET "brandId" = "id";
ALTER TABLE "Merchant" ALTER COLUMN "brandId" SET NOT NULL;

ALTER TABLE "Merchant" ALTER COLUMN "email" DROP NOT NULL;

-- ---------------------------------------------------------------------------------------
-- 5. Promotion cuelga del programa, no del local
-- ---------------------------------------------------------------------------------------
ALTER TABLE "Promotion" ADD COLUMN "programId" UUID;

UPDATE "Promotion" pr
SET "programId" = lp."id"
FROM "LoyaltyProgram" lp
WHERE lp."brandId" = pr."merchantId";

ALTER TABLE "Promotion" ALTER COLUMN "programId" SET NOT NULL;

-- ---------------------------------------------------------------------------------------
-- 6. Pass: único por cliente y programa
-- ---------------------------------------------------------------------------------------
ALTER TABLE "Pass" ADD COLUMN "programId" UUID, ADD COLUMN "brandId" UUID;

UPDATE "Pass" p
SET "programId" = lp."id", "brandId" = lp."brandId"
FROM "LoyaltyProgram" lp
WHERE lp."brandId" = p."merchantId";

ALTER TABLE "Pass" ALTER COLUMN "programId" SET NOT NULL, ALTER COLUMN "brandId" SET NOT NULL;

-- ---------------------------------------------------------------------------------------
-- 7. Stamp y Scan heredan marca y programa del pase
-- ---------------------------------------------------------------------------------------
ALTER TABLE "Stamp" ADD COLUMN "brandId" UUID, ADD COLUMN "programId" UUID;
UPDATE "Stamp" s SET "brandId" = p."brandId", "programId" = p."programId" FROM "Pass" p WHERE p."id" = s."passId";
ALTER TABLE "Stamp" ALTER COLUMN "brandId" SET NOT NULL, ALTER COLUMN "programId" SET NOT NULL;

ALTER TABLE "Scan" ADD COLUMN "brandId" UUID, ADD COLUMN "programId" UUID;
UPDATE "Scan" s SET "brandId" = p."brandId", "programId" = p."programId" FROM "Pass" p WHERE p."id" = s."passId";
ALTER TABLE "Scan" ALTER COLUMN "brandId" SET NOT NULL, ALTER COLUMN "programId" SET NOT NULL;

-- ---------------------------------------------------------------------------------------
-- 8. Membresías: MerchantUser → BrandMember
-- ---------------------------------------------------------------------------------------
INSERT INTO "BrandMember" ("userId", "brandId", "role", "merchantId", "createdAt")
SELECT mu."userId",
       mu."merchantId",
       mu."role",
       CASE WHEN mu."role" = 'STAFF'::"MerchantRole" THEN mu."merchantId" ELSE NULL END,
       mu."createdAt"
FROM "MerchantUser" mu;

-- ---------------------------------------------------------------------------------------
-- 9. Fuera lo que dependía del modelo anterior
-- ---------------------------------------------------------------------------------------
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

DROP VIEW IF EXISTS public."PassStampBalance";

DROP TABLE "MerchantUser";

ALTER TABLE "Merchant" DROP COLUMN "stampValidityDays";

ALTER TABLE "Promotion" DROP CONSTRAINT "Promotion_merchantId_fkey";
ALTER TABLE "Promotion" DROP COLUMN "merchantId";

DROP INDEX "Pass_customerId_merchantId_key";

-- ---------------------------------------------------------------------------------------
-- 10. Índices y claves foráneas
-- ---------------------------------------------------------------------------------------
CREATE INDEX "Merchant_brandId_idx" ON "Merchant"("brandId");
CREATE INDEX "BrandMember_userId_idx" ON "BrandMember"("userId");
CREATE INDEX "BrandMember_merchantId_idx" ON "BrandMember"("merchantId");
CREATE INDEX "LoyaltyProgram_brandId_idx" ON "LoyaltyProgram"("brandId");
CREATE INDEX "Promotion_programId_idx" ON "Promotion"("programId");
CREATE UNIQUE INDEX "Pass_customerId_programId_key" ON "Pass"("customerId", "programId");
CREATE INDEX "Pass_brandId_idx" ON "Pass"("brandId");
CREATE INDEX "Pass_merchantId_idx" ON "Pass"("merchantId");
CREATE INDEX "Stamp_brandId_earnedAt_idx" ON "Stamp"("brandId", "earnedAt");
CREATE INDEX "Scan_brandId_createdAt_idx" ON "Scan"("brandId", "createdAt");
CREATE INDEX "Scan_merchantId_createdAt_idx" ON "Scan"("merchantId", "createdAt");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandMember" ADD CONSTRAINT "BrandMember_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandMember" ADD CONSTRAINT "BrandMember_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Pass" ADD CONSTRAINT "Pass_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Stamp" ADD CONSTRAINT "Stamp_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Stamp" ADD CONSTRAINT "Stamp_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------------------
-- 11. Funciones helper del RLS (mismo criterio que 20260921020000)
-- ---------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_brand_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT bm."brandId" FROM public."BrandMember" bm WHERE bm."userId" = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_brand_owner(b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."BrandMember" bm
    WHERE bm."userId" = auth.uid() AND bm."brandId" = b AND bm."role" = 'OWNER'::"MerchantRole"
  );
$$;

-- OWNER: todos los locales de su marca. STAFF: solo el asignado.
CREATE OR REPLACE FUNCTION public.current_merchant_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m."id"
  FROM public."BrandMember" bm
  JOIN public."Merchant" m ON m."brandId" = bm."brandId"
  WHERE bm."userId" = auth.uid()
    AND (bm."role" = 'OWNER'::"MerchantRole" OR bm."merchantId" = m."id");
$$;

CREATE OR REPLACE FUNCTION public.is_merchant_owner(m uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."Merchant" mm
    JOIN public."BrandMember" bm ON bm."brandId" = mm."brandId"
    WHERE mm."id" = m AND bm."userId" = auth.uid() AND bm."role" = 'OWNER'::"MerchantRole"
  );
$$;

CREATE OR REPLACE FUNCTION public.current_program_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT lp."id"
  FROM public."LoyaltyProgram" lp
  JOIN public."BrandMember" bm ON bm."brandId" = lp."brandId"
  WHERE bm."userId" = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_program_owner(p uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."LoyaltyProgram" lp
    JOIN public."BrandMember" bm ON bm."brandId" = lp."brandId"
    WHERE lp."id" = p AND bm."userId" = auth.uid() AND bm."role" = 'OWNER'::"MerchantRole"
  );
$$;

-- ---------------------------------------------------------------------------------------
-- 12. Triggers de consistencia: brandId y programId redundantes se derivan, nunca los decide
--     quien escribe, y un local solo aparece en filas de su propia marca.
-- ---------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_merchant_in_brand(p_merchant uuid, p_brand uuid)
RETURNS void
LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."Merchant" WHERE "id" = p_merchant AND "brandId" = p_brand) THEN
    RAISE EXCEPTION 'El local % no pertenece a la marca %', p_merchant, p_brand
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.pass_derive_brand()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT lp."brandId" INTO NEW."brandId" FROM public."LoyaltyProgram" lp WHERE lp."id" = NEW."programId";
  IF NEW."brandId" IS NULL THEN
    RAISE EXCEPTION 'El programa % no existe', NEW."programId" USING ERRCODE = 'foreign_key_violation';
  END IF;
  PERFORM public.assert_merchant_in_brand(NEW."merchantId", NEW."brandId");
  RETURN NEW;
END;
$$;

CREATE TRIGGER pass_derive_brand
  BEFORE INSERT OR UPDATE OF "programId", "brandId", "merchantId" ON "Pass"
  FOR EACH ROW EXECUTE FUNCTION public.pass_derive_brand();

CREATE OR REPLACE FUNCTION public.ledger_derive_from_pass()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT p."brandId", p."programId" INTO NEW."brandId", NEW."programId"
  FROM public."Pass" p WHERE p."id" = NEW."passId";
  IF NEW."brandId" IS NULL THEN
    RAISE EXCEPTION 'El pase % no existe', NEW."passId" USING ERRCODE = 'foreign_key_violation';
  END IF;
  PERFORM public.assert_merchant_in_brand(NEW."merchantId", NEW."brandId");
  RETURN NEW;
END;
$$;

CREATE TRIGGER stamp_derive_from_pass
  BEFORE INSERT OR UPDATE OF "passId", "brandId", "programId", "merchantId" ON "Stamp"
  FOR EACH ROW EXECUTE FUNCTION public.ledger_derive_from_pass();

CREATE TRIGGER scan_derive_from_pass
  BEFORE INSERT OR UPDATE OF "passId", "brandId", "programId", "merchantId" ON "Scan"
  FOR EACH ROW EXECUTE FUNCTION public.ledger_derive_from_pass();

CREATE OR REPLACE FUNCTION public.brand_member_check_location()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW."merchantId" IS NOT NULL THEN
    PERFORM public.assert_merchant_in_brand(NEW."merchantId", NEW."brandId");
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER brand_member_check_location
  BEFORE INSERT OR UPDATE OF "merchantId", "brandId" ON "BrandMember"
  FOR EACH ROW EXECUTE FUNCTION public.brand_member_check_location();

-- A lo más un programa STAMPS por marca (HANDOFF §8.10). Trigger y no índice parcial porque
-- Prisma no modela índices parciales y los marcaría como drift.
CREATE OR REPLACE FUNCTION public.loyalty_program_single_stamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW."type" = 'STAMPS'::"ProgramType" THEN
    PERFORM pg_advisory_xact_lock(hashtext('loyalty_program_stamps:' || NEW."brandId"::text));
    IF EXISTS (
      SELECT 1 FROM public."LoyaltyProgram"
      WHERE "brandId" = NEW."brandId" AND "type" = 'STAMPS'::"ProgramType" AND "id" <> NEW."id"
    ) THEN
      RAISE EXCEPTION 'La marca % ya tiene un programa de sellos', NEW."brandId"
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER loyalty_program_single_stamps
  BEFORE INSERT OR UPDATE OF "type", "brandId" ON "LoyaltyProgram"
  FOR EACH ROW EXECUTE FUNCTION public.loyalty_program_single_stamps();

-- ---------------------------------------------------------------------------------------
-- 13. RLS. Pass, Stamp y Scan no tienen políticas de escritura: los escribe el backend.
-- ---------------------------------------------------------------------------------------
ALTER TABLE "Brand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoyaltyProgram" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrandMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformAdmin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_select" ON "Brand"
  FOR SELECT USING ("id" IN (SELECT public.current_brand_ids()));

CREATE POLICY "merchant_select" ON "Merchant"
  FOR SELECT USING ("id" IN (SELECT public.current_merchant_ids()));

CREATE POLICY "merchant_update" ON "Merchant"
  FOR UPDATE USING (public.is_merchant_owner("id"))
  WITH CHECK (public.is_merchant_owner("id"));

CREATE POLICY "brand_member_select" ON "BrandMember"
  FOR SELECT USING ("userId" = auth.uid() OR public.is_brand_owner("brandId"));

CREATE POLICY "loyalty_program_select" ON "LoyaltyProgram"
  FOR SELECT USING ("brandId" IN (SELECT public.current_brand_ids()));

CREATE POLICY "loyalty_program_update" ON "LoyaltyProgram"
  FOR UPDATE USING (public.is_brand_owner("brandId"))
  WITH CHECK (public.is_brand_owner("brandId"));

CREATE POLICY "promotion_select" ON "Promotion"
  FOR SELECT USING ("programId" IN (SELECT public.current_program_ids()));

CREATE POLICY "promotion_insert" ON "Promotion"
  FOR INSERT WITH CHECK (public.is_program_owner("programId"));

CREATE POLICY "promotion_update" ON "Promotion"
  FOR UPDATE USING (public.is_program_owner("programId"))
  WITH CHECK (public.is_program_owner("programId"));

CREATE POLICY "promotion_delete" ON "Promotion"
  FOR DELETE USING (public.is_program_owner("programId"));

CREATE POLICY "pass_select" ON "Pass"
  FOR SELECT USING ("brandId" IN (SELECT public.current_brand_ids()));

CREATE POLICY "stamp_select" ON "Stamp"
  FOR SELECT USING (
    public.is_brand_owner("brandId") OR "merchantId" IN (SELECT public.current_merchant_ids())
  );

CREATE POLICY "scan_select" ON "Scan"
  FOR SELECT USING (
    public.is_brand_owner("brandId") OR "merchantId" IN (SELECT public.current_merchant_ids())
  );

CREATE POLICY "customer_select" ON "Customer"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Pass" p
      WHERE p."customerId" = "Customer"."id" AND public.is_brand_owner(p."brandId")
    )
  );

-- PlatformAdmin y AuditLog: RLS sin políticas a propósito (HANDOFF §7.10).

-- ---------------------------------------------------------------------------------------
-- 14. Saldo calculado al leer
-- ---------------------------------------------------------------------------------------
CREATE VIEW public."PassStampBalance" WITH (security_invoker = true) AS
SELECT
  p.id            AS "passId",
  p."merchantId"  AS "merchantId",
  p."customerId"  AS "customerId",
  COUNT(s.id) FILTER (WHERE s."consumedAt" IS NULL AND (s."expiresAt" IS NULL OR s."expiresAt" > now()))::int AS "activeStamps",
  MIN(s."expiresAt") FILTER (WHERE s."consumedAt" IS NULL AND s."expiresAt" > now()) AS "nextExpiryAt",
  p."brandId"     AS "brandId",
  p."programId"   AS "programId"
FROM public."Pass" p
LEFT JOIN public."Stamp" s ON s."passId" = p.id
GROUP BY p.id;

-- ---------------------------------------------------------------------------------------
-- 15. Alta de un dueño nuevo. raw_user_meta_data NUNCA decide permisos (20260924190000).
-- ---------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_name text;
BEGIN
  -- Invitación de personal: la membresía la crea StaffService.
  IF NULLIF(new.raw_user_meta_data ->> 'merchant_id', '') IS NOT NULL THEN
    RETURN new;
  END IF;

  -- Admin interno: no recibe marca. Como la metadata la escribe el cliente, esto solo evita
  -- crear la marca y no otorga nada: los permisos salen de la tabla PlatformAdmin.
  IF new.raw_user_meta_data ->> 'platform_admin' = 'true' THEN
    RETURN new;
  END IF;

  v_name := 'Mi Local (' || split_part(new.email, '@', 1) || ')';

  INSERT INTO public."Brand" (id, name, "contactEmail")
  VALUES (new.id, v_name, new.email);

  INSERT INTO public."Merchant" (id, "brandId", email, name, slug)
  VALUES (new.id, new.id, new.email, v_name, 'local-' || left(replace(new.id::text, '-', ''), 8));

  INSERT INTO public."LoyaltyProgram" ("brandId", name)
  VALUES (new.id, 'Tarjeta de sellos');

  INSERT INTO public."BrandMember" ("userId", "brandId", "role")
  VALUES (new.id, new.id, 'OWNER'::"MerchantRole")
  ON CONFLICT ("userId", "brandId") DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ---------------------------------------------------------------------------------------
-- 16. Privilegios mínimos. Supabase concede ALL sobre todo objeto nuevo (default privileges):
--     primero se quita todo y después se concede lo justo.
-- ---------------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public."Brand", public."LoyaltyProgram", public."BrandMember", public."PlatformAdmin", public."AuditLog", public."PassStampBalance" FROM anon';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON public."Brand", public."LoyaltyProgram", public."BrandMember", public."PlatformAdmin", public."AuditLog" FROM authenticated';

    EXECUTE 'GRANT SELECT ON public."Brand", public."LoyaltyProgram", public."BrandMember", public."PassStampBalance" TO authenticated';

    EXECUTE 'REVOKE SELECT ON public."Pass" FROM authenticated';
    EXECUTE 'GRANT SELECT (id, "customerId", "programId", "brandId", "merchantId", "createdAt", "updatedAt") ON public."Pass" TO authenticated';

    EXECUTE 'GRANT UPDATE (name) ON public."Merchant" TO authenticated';
    EXECUTE 'GRANT UPDATE (name, "stampValidityDays") ON public."LoyaltyProgram" TO authenticated';
    EXECUTE 'GRANT INSERT, UPDATE, DELETE ON public."Promotion" TO authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT ALL ON public."Brand", public."LoyaltyProgram", public."BrandMember", public."PlatformAdmin", public."AuditLog" TO service_role';
    EXECUTE 'GRANT SELECT ON public."PassStampBalance" TO service_role';
  END IF;
END
$$;

REVOKE ALL ON FUNCTION public.current_brand_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_brand_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_program_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_program_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_merchant_in_brand(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pass_derive_brand() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ledger_derive_from_pass() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.brand_member_check_location() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.loyalty_program_single_stamps() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.current_brand_ids(), public.is_brand_owner(uuid), public.current_program_ids(), public.is_program_owner(uuid), public.current_merchant_ids(), public.is_merchant_owner(uuid), public.assert_merchant_in_brand(uuid, uuid), public.pass_derive_brand(), public.ledger_derive_from_pass(), public.brand_member_check_location(), public.loyalty_program_single_stamps() FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.assert_merchant_in_brand(uuid, uuid), public.pass_derive_brand(), public.ledger_derive_from_pass(), public.brand_member_check_location(), public.loyalty_program_single_stamps() FROM authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.current_brand_ids(), public.is_brand_owner(uuid), public.current_program_ids(), public.is_program_owner(uuid), public.current_merchant_ids(), public.is_merchant_owner(uuid) TO authenticated';
  END IF;
END
$$;
