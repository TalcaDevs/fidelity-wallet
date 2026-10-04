-- Restricciones nativas: no dependen de un lock por hash ni de código de aplicación.
BEGIN;

ALTER TABLE "LoyaltyProgram"
  ADD CONSTRAINT "LoyaltyProgram_brandId_key" UNIQUE ("brandId");

DROP TRIGGER IF EXISTS loyalty_program_single_per_brand ON "LoyaltyProgram";
DROP FUNCTION IF EXISTS public.loyalty_program_single_per_brand();

-- Limpia solo campos que no participan en la modalidad vigente; conserva vencimientos.
UPDATE "LoyaltyProgram"
SET "cardExpiresAt" = CASE WHEN "cardValidity" = 'FIXED_DATE' THEN "cardExpiresAt" ELSE NULL END,
    "cardValidityDays" = CASE WHEN "cardValidity" = 'AFTER_JOIN' THEN "cardValidityDays" ELSE NULL END
WHERE ("cardValidity" <> 'FIXED_DATE' AND "cardExpiresAt" IS NOT NULL)
   OR ("cardValidity" <> 'AFTER_JOIN' AND "cardValidityDays" IS NOT NULL);

ALTER TABLE "LoyaltyProgram"
  DROP CONSTRAINT "LoyaltyProgram_cardValidity_fields",
  ADD CONSTRAINT "LoyaltyProgram_cardValidity_fields" CHECK (
    ("cardValidity" = 'UNLIMITED' AND "cardExpiresAt" IS NULL AND "cardValidityDays" IS NULL)
    OR ("cardValidity" = 'FIXED_DATE' AND "cardExpiresAt" IS NOT NULL AND "cardValidityDays" IS NULL)
    OR ("cardValidity" = 'AFTER_JOIN' AND "cardExpiresAt" IS NULL
        AND "cardValidityDays" IS NOT NULL AND "cardValidityDays" BETWEEN 1 AND 3650)
  );

COMMIT;
