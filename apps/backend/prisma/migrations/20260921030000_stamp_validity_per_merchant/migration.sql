-- La vigencia de los sellos pasa de la promocion al comercio.
--
-- Se habia modelado en "Promotion" para permitir plazos distintos por promocion, pero la
-- vigencia no es una regla del premio: es una regla del local ("en mi cafeteria los sellos
-- valen 3 meses"). El dueno la configura una sola vez, junto al nombre del negocio, y no
-- tiene que acordarse de repetirla en cada promocion que crea.
--
-- Ademas saca un problema de encima: "Pass" todavia no sabe a que promocion pertenece
-- (§8.2 del HANDOFF), asi que con la vigencia en "Promotion" un escaneo tenia que decidir
-- primero que promocion aplicaba solo para saber cuantos dias dura el sello. En "Merchant"
-- el dato es inequivoco desde el primer escaneo.
--
-- NULL sigue significando "los sellos de este local no vencen", y el vencimiento se sigue
-- congelando al sellar: mover el parametro no toca ningun "Stamp" ya entregado.

ALTER TABLE "Merchant" ADD COLUMN "stampValidityDays" INTEGER;

-- Si algun comercio ya habia configurado vigencia en sus promociones, se conserva el plazo
-- mas largo: al subir el dato de nivel, el criterio prudente es no acortarle la vigencia a
-- nadie sin avisar.
UPDATE "Merchant" m
SET "stampValidityDays" = agg."maxDays"
FROM (
  SELECT "merchantId", MAX("stampValidityDays") AS "maxDays"
  FROM "Promotion"
  WHERE "stampValidityDays" IS NOT NULL
  GROUP BY "merchantId"
) agg
WHERE m.id = agg."merchantId";

ALTER TABLE "Promotion" DROP COLUMN "stampValidityDays";
