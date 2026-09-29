-- Migración: scan_method_audit
-- Registra en Scan si el pase fue resuelto por lectura de código QR o por búsqueda manual
-- (RUT/teléfono en caja), para auditar y monitorear el uso de la búsqueda manual.
--
-- NOTA DE AUDITORÍA: Los registros anteriores a esta migración (2026-09-25) adoptan 'QR'
-- como valor retroactivo por omisión; no representan fidedignamente consultas manuales previas.

CREATE TYPE "ScanMethod" AS ENUM ('QR', 'MANUAL');

ALTER TABLE "Scan" ADD COLUMN "method" "ScanMethod" NOT NULL DEFAULT 'QR';
