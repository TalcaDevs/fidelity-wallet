-- Migración: scan_method_audit
-- Registra en Scan si el pase fue resuelto por lectura de código QR o por búsqueda manual
-- (RUT/teléfono en caja), para auditar y monitorear el uso de la búsqueda manual.

CREATE TYPE "ScanMethod" AS ENUM ('QR', 'MANUAL');

ALTER TABLE "Scan" ADD COLUMN "method" "ScanMethod" NOT NULL DEFAULT 'QR';
