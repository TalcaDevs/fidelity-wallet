-- La bienvenida conserva su configuración por moneda aunque se desactive una modalidad.
-- welcomeBalance permanece para clientes antiguos, pero las altas nuevas usan estos campos.
ALTER TABLE "LoyaltyProgram"
  ADD COLUMN "welcomeStamps" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "welcomePoints" INTEGER NOT NULL DEFAULT 0;

UPDATE "LoyaltyProgram"
SET "welcomeStamps" = CASE WHEN "type" = 'STAMPS' THEN "welcomeBalance" ELSE 0 END,
    "welcomePoints" = CASE WHEN "type" = 'POINTS' THEN "welcomeBalance" ELSE 0 END;

-- Las cargas de puntos pueden sumar cero sellos. Los canjes conservan el default legacy;
-- solo STAMP_ADDED exige que alguna moneda tenga una cantidad positiva.
ALTER TABLE "Scan" DROP CONSTRAINT "Scan_stampCount_positive";

-- Antes de la coexistencia, stampCount era también el contador de puntos. Se conserva
-- esa cantidad original cuando el ledger acredita inequívocamente la moneda POINTS.
-- No sumar las filas del ledger: un canje FIFO antiguo podía crear remanentes sin reducir
-- amount de la fila consumida. No reclasificar monedas ni modificar saldos históricos.
UPDATE "Scan" scan
SET "pointsEarned" = scan."stampCount", "stampCount" = 0
WHERE scan."type" = 'STAMP_ADDED'
  AND scan."pointsEarned" = 0
  AND scan."stampCount" > 0
  AND EXISTS (
    SELECT 1 FROM "Stamp" s
    WHERE s."sourceScanId" = scan.id AND s."currency" = 'POINTS'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "Stamp" s
    WHERE s."sourceScanId" = scan.id AND s."currency" = 'STAMPS'
  );

ALTER TABLE "Scan"
  ADD CONSTRAINT "Scan_stampCount_non_negative" CHECK ("stampCount" >= 0),
  ADD CONSTRAINT "Scan_pointsEarned_non_negative" CHECK ("pointsEarned" >= 0),
  ADD CONSTRAINT "Scan_added_currency_positive" CHECK (
    "type" <> 'STAMP_ADDED' OR "stampCount" > 0 OR "pointsEarned" > 0
  );

-- CREATE OR REPLACE conserva grants y el orden/tipo de las columnas existentes.
-- security_invoker mantiene el aislamiento de marca aplicado por RLS en las tablas.
CREATE OR REPLACE VIEW public."PassStampBalance" WITH (security_invoker = true) AS
SELECT
  p.id           AS "passId",
  p."merchantId" AS "merchantId",
  p."customerId" AS "customerId",
  COALESCE(SUM(s.amount) FILTER (
    WHERE lp."stampsEnabled" AND s.currency = 'STAMPS'
      AND s."consumedAt" IS NULL AND (s."expiresAt" IS NULL OR s."expiresAt" > now())
  ), 0)::int AS "activeStamps",
  MIN(s."expiresAt") FILTER (
    WHERE s."consumedAt" IS NULL AND s."expiresAt" > now()
      AND ((lp."stampsEnabled" AND s.currency = 'STAMPS')
        OR (lp."pointsEnabled" AND s.currency = 'POINTS'))
  ) AS "nextExpiryAt",
  p."brandId"   AS "brandId",
  p."programId" AS "programId",
  COALESCE(SUM(s.amount) FILTER (
    WHERE lp."pointsEnabled" AND s.currency = 'POINTS'
      AND s."consumedAt" IS NULL AND (s."expiresAt" IS NULL OR s."expiresAt" > now())
  ), 0)::int AS "activePoints",
  lp."stampsEnabled" AS "stampsEnabled",
  lp."pointsEnabled" AS "pointsEnabled"
FROM public."Pass" p
JOIN public."LoyaltyProgram" lp ON lp.id = p."programId"
LEFT JOIN public."Stamp" s ON s."passId" = p.id
GROUP BY p.id, lp.id;
