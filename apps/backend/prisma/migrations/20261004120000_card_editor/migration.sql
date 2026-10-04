-- Editor de la tarjeta (/admin/card): tarjeta de sellos o de puntos, reglas, diseño del pase,
-- detalles y datos que pide el registro.

ALTER TYPE "ProgramType" ADD VALUE IF NOT EXISTS 'POINTS';
ALTER TYPE "ScanMethod" ADD VALUE IF NOT EXISTS 'WELCOME';

CREATE TYPE "CardValidity" AS ENUM ('UNLIMITED', 'FIXED_DATE', 'AFTER_JOIN');

-- Puntos por marca: los habilita el OWNER o SUPERADMIN; por defecto 1 punto cada $1.000.
ALTER TABLE "Brand"
  ADD COLUMN "pointsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pesosPerPoint" INTEGER NOT NULL DEFAULT 1000;

ALTER TABLE "Brand"
  ADD CONSTRAINT "Brand_pesosPerPoint_positive" CHECK ("pesosPerPoint" BETWEEN 1 AND 1000000);

ALTER TABLE "LoyaltyProgram"
  ADD COLUMN "welcomeBalance" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "dailyStampLimit" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "cardValidity" "CardValidity" NOT NULL DEFAULT 'UNLIMITED',
  ADD COLUMN "cardExpiresAt" TIMESTAMP(3),
  ADD COLUMN "cardValidityDays" INTEGER,
  ADD COLUMN "design" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "details" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "registration" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "designVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "LoyaltyProgram"
  ADD CONSTRAINT "LoyaltyProgram_welcomeBalance_range" CHECK ("welcomeBalance" BETWEEN 0 AND 100000),
  ADD CONSTRAINT "LoyaltyProgram_cardValidity_fields" CHECK (
    ("cardValidity" = 'UNLIMITED')
    OR ("cardValidity" = 'FIXED_DATE' AND "cardExpiresAt" IS NOT NULL)
    OR ("cardValidity" = 'AFTER_JOIN' AND "cardValidityDays" BETWEEN 1 AND 3650)
  ),
  ADD CONSTRAINT "LoyaltyProgram_json_objects" CHECK (
    jsonb_typeof("design") = 'object'
    AND jsonb_typeof("details") = 'object'
    AND jsonb_typeof("registration") = 'object'
  );

-- Una tarjeta por marca, del tipo que sea (antes: un programa STAMPS por marca). Cambiar de
-- sellos a puntos es un UPDATE de la misma fila.
DROP TRIGGER IF EXISTS loyalty_program_single_stamps ON "LoyaltyProgram";
DROP FUNCTION IF EXISTS public.loyalty_program_single_stamps();

CREATE OR REPLACE FUNCTION public.loyalty_program_single_per_brand()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('loyalty_program:' || NEW."brandId"::text));
  IF EXISTS (
    SELECT 1 FROM public."LoyaltyProgram"
    WHERE "brandId" = NEW."brandId" AND "id" <> NEW."id"
  ) THEN
    RAISE EXCEPTION 'La marca % ya tiene una tarjeta', NEW."brandId"
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER loyalty_program_single_per_brand
  BEFORE INSERT OR UPDATE OF "brandId" ON "LoyaltyProgram"
  FOR EACH ROW EXECUTE FUNCTION public.loyalty_program_single_per_brand();

REVOKE ALL ON FUNCTION public.loyalty_program_single_per_brand() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.loyalty_program_single_per_brand() FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.loyalty_program_single_per_brand() FROM authenticated';
  END IF;
END
$$;
