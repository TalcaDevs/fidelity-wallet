-- Validación del escaneo con datos de la compra, carga de varios sellos por el OWNER y datos
-- nuevos del cliente en el alta (/join).
--
-- Customer: correo, nombre y cumpleaños (día y mes; año opcional). Todo nullable: los clientes
-- anteriores no los tienen. Que el alta traiga teléfono o correo lo aplica la API.
ALTER TABLE "Customer"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "name" TEXT,
  ADD COLUMN "birthDay" SMALLINT,
  ADD COLUMN "birthMonth" SMALLINT,
  ADD COLUMN "birthYear" SMALLINT;

CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_email_lowercase" CHECK ("email" IS NULL OR "email" = lower("email")),
  ADD CONSTRAINT "Customer_birthday_parts" CHECK (
    ("birthDay" IS NULL AND "birthMonth" IS NULL AND "birthYear" IS NULL)
    OR ("birthDay" IS NOT NULL AND "birthMonth" IS NOT NULL
        AND "birthDay" BETWEEN 1 AND 31 AND "birthMonth" BETWEEN 1 AND 12
        AND ("birthYear" IS NULL OR "birthYear" >= 1900))
  );

-- Scan: cuántos sellos sumó (el OWNER puede cargar varios de una vez) y los datos opcionales
-- de la compra. El monto solo se registra: no da sellos.
ALTER TABLE "Scan"
  ADD COLUMN "stampCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "purchaseAmount" INTEGER,
  ADD COLUMN "note" TEXT;

-- Un canje no suma sellos: su stampCount queda en 1 por el DEFAULT y no se lee.
ALTER TABLE "Scan"
  ADD CONSTRAINT "Scan_stampCount_positive" CHECK ("stampCount" >= 1),
  ADD CONSTRAINT "Scan_purchaseAmount_non_negative" CHECK ("purchaseAmount" IS NULL OR "purchaseAmount" >= 0),
  ADD CONSTRAINT "Scan_note_length" CHECK ("note" IS NULL OR char_length("note") <= 280);

-- Foto de la boleta. Tabla aparte porque el STAFF lee Scan por RLS (scan_select) y la foto solo
-- la ven el OWNER y SUPERADMIN, siempre a través del backend con URL firmada. Igual que Ticket:
-- RLS sin políticas y sin grants para anon ni authenticated.
CREATE TABLE "ScanReceipt" (
  "scanId" UUID NOT NULL,
  "storagePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "uploadedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScanReceipt_pkey" PRIMARY KEY ("scanId")
);

CREATE UNIQUE INDEX "ScanReceipt_storagePath_key" ON "ScanReceipt"("storagePath");

ALTER TABLE "ScanReceipt" ADD CONSTRAINT "ScanReceipt_scanId_fkey"
  FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScanReceipt" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public."ScanReceipt" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON public."ScanReceipt" FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT ALL ON public."ScanReceipt" TO service_role';
  END IF;
END
$$;
