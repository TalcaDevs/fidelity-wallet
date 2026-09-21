-- Sellos con vencimiento FIFO.
--
-- Hasta ahora un sello no existia como entidad: era el entero "Pass"."stampsCount".
-- Con un contador plano no hay forma de expirar nada, porque no se sabe CUANDO se
-- gano cada sello. Esta migracion materializa cada sello como una fila y elimina el
-- contador.
--
-- Decisiones de producto que este esquema fija (y el motivo de cada una):
--
--   1. "expiresAt" se calcula al sellar (earnedAt + stampValidityDays de la promocion
--      vigente en ese instante) y queda CONGELADO. No se recalcula nunca. Si el dueno
--      del local acorta la vigencia manana, no le quema retroactivamente sellos que el
--      cliente ya tenia ganados bajo las reglas viejas. "expiresAt" NULL = no vence.
--
--   2. El canje consume los sellos MAS VIEJOS primero (FIFO): marca "consumedAt" y
--      "consumedByScanId". Esa logica vive en el backend; aca solo queda el modelo que
--      la hace posible. Los sellos consumidos no se borran: son la auditoria del canje.
--
--   3. El saldo se calcula SIEMPRE al leer, con la vista "PassStampBalance". No hay
--      contador desnormalizado ni cron: un sello vence por el mero paso del tiempo, asi
--      que cualquier valor guardado estaria mal apenas pasa el reloj. Ningun proceso
--      batch es responsable de la correccion del saldo.

-- 1. Vigencia configurable por promocion. NULL = los sellos de esa promocion no vencen,
--    que es el comportamiento historico y por eso el default implicito.
ALTER TABLE "Promotion" ADD COLUMN "stampValidityDays" INTEGER;

-- 2. Auditoria de quien ejecuto el scan. Hoy siempre es el dueno porque hay un usuario
--    por comercio; se agrega ahora para que la migracion de roles (OWNER/STAFF) no tenga
--    que tocar datos historicos.
ALTER TABLE "Scan" ADD COLUMN "createdByUserId" UUID;

-- 3. El sello como entidad.
CREATE TABLE "Stamp" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "passId" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "promotionId" UUID,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "consumedByScanId" UUID,
    "sourceScanId" UUID,
    "createdByUserId" UUID,

    CONSTRAINT "Stamp_pkey" PRIMARY KEY ("id")
);

-- Indice pensado para la consulta caliente: los sellos activos de un pase, ordenados
-- para el consumo FIFO y para el conteo de la vista.
CREATE INDEX "Stamp_passId_consumedAt_expiresAt_idx" ON "Stamp"("passId", "consumedAt", "expiresAt");

-- Usado por las politicas RLS, que filtran siempre por comercio.
CREATE INDEX "Stamp_merchantId_idx" ON "Stamp"("merchantId");

ALTER TABLE "Stamp" ADD CONSTRAINT "Stamp_passId_fkey" FOREIGN KEY ("passId") REFERENCES "Pass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Stamp" ADD CONSTRAINT "Stamp_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SET NULL y no CASCADE: si se borra la promocion, el sello ya ganado por el cliente
-- sigue valiendo. Borrar una promocion no puede vaciarle la tarjeta a nadie.
ALTER TABLE "Stamp" ADD CONSTRAINT "Stamp_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Backfill ANTES de dropear la columna: por cada pase con saldo, una fila por sello.
--    "earnedAt" = "updatedAt" del pase porque es lo mas cercano a la fecha del ultimo
--    sello que existe en los datos. "expiresAt" queda NULL a proposito: los sellos
--    anteriores a esta funcionalidad no vencen, por el mismo criterio de no-retroactividad
--    del punto 1 de la cabecera.
INSERT INTO "Stamp" ("passId", "merchantId", "earnedAt", "expiresAt")
SELECT p."id", p."merchantId", p."updatedAt", NULL
FROM "Pass" p
CROSS JOIN LATERAL generate_series(1, p."stampsCount") AS g(n)
WHERE p."stampsCount" > 0;

-- 5. Recien ahora se elimina el contador. Era una segunda fuente de verdad y con
--    vencimiento queda obsoleto solo, sin que nadie escriba nada.
ALTER TABLE "Pass" DROP COLUMN "stampsCount";

-- 6. El saldo, calculado al leer.
--    WITH (security_invoker = true) es obligatorio: por defecto una vista se ejecuta con
--    los permisos de su DUENO, lo que saltearia el RLS de "Pass" y "Stamp" y dejaria a
--    cualquier usuario autenticado ver el saldo de todos los comercios. Con
--    security_invoker la vista corre con los permisos de quien consulta y el RLS aplica.
CREATE OR REPLACE VIEW public."PassStampBalance" WITH (security_invoker = true) AS
SELECT
  p.id            AS "passId",
  p."merchantId"  AS "merchantId",
  p."customerId"  AS "customerId",
  COUNT(s.id) FILTER (WHERE s."consumedAt" IS NULL AND (s."expiresAt" IS NULL OR s."expiresAt" > now()))::int AS "activeStamps",
  MIN(s."expiresAt") FILTER (WHERE s."consumedAt" IS NULL AND s."expiresAt" > now()) AS "nextExpiryAt"
FROM public."Pass" p
LEFT JOIN public."Stamp" s ON s."passId" = p.id
GROUP BY p.id;

-- "nextExpiryAt" ignora a proposito los sellos con "expiresAt" NULL (la comparacion
-- NULL > now() no es verdadera): un sello que no vence no tiene proximo vencimiento que
-- avisarle al cliente. Si el pase no tiene ningun sello con fecha, queda NULL.

-- Los grants de Supabase para anon/authenticated/service_role se aplican por default
-- privileges sobre lo que crea el rol de las migraciones, pero la vista es un objeto
-- nuevo y conviene ser explicito. Se protege con un IF por si la base no es Supabase.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT ON public."PassStampBalance" TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT SELECT ON public."PassStampBalance" TO service_role';
  END IF;
END
$$;

-- 7. RLS con el mismo criterio que el resto de las tablas en este punto de la historia.
--    La migracion 20260921020000_merchant_users_and_roles reescribe esta politica junto
--    con todas las demas para usar membresia en vez de auth.uid() directo.
ALTER TABLE "Stamp" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stamp_own" ON "Stamp";

CREATE POLICY "stamp_own" ON "Stamp"
  FOR ALL USING ("merchantId" = auth.uid());
