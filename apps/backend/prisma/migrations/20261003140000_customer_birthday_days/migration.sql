-- El CHECK de 20261003120000 solo acotaba día 1-31 y mes 1-12: aceptaba fechas imposibles como el
-- 31 de febrero. Ahora el día respeta el largo del mes, y el 29 de febrero exige un año bisiesto
-- cuando hay año (sin año vale: el cliente puede haber nacido en uno). Misma regla que
-- isValidBirthday de @fidelity/shared, que aplica la API.
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_birthday_parts";

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_birthday_parts" CHECK (
    ("birthDay" IS NULL AND "birthMonth" IS NULL AND "birthYear" IS NULL)
    OR (
      "birthDay" IS NOT NULL AND "birthMonth" IS NOT NULL
      AND "birthMonth" BETWEEN 1 AND 12
      AND "birthDay" BETWEEN 1 AND (
        CASE "birthMonth"
          WHEN 2 THEN 29
          WHEN 4 THEN 30 WHEN 6 THEN 30 WHEN 9 THEN 30 WHEN 11 THEN 30
          ELSE 31
        END
      )
      AND ("birthYear" IS NULL OR "birthYear" >= 1900)
      AND NOT (
        "birthMonth" = 2 AND "birthDay" = 29 AND "birthYear" IS NOT NULL
        AND NOT ("birthYear" % 4 = 0 AND ("birthYear" % 100 <> 0 OR "birthYear" % 400 = 0))
      )
    )
  );
