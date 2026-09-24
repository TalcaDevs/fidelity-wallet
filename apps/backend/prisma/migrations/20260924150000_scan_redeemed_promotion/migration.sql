-- Migración: scan_redeemed_promotion
-- Los sellos pasan a ser un saldo único por pase: cualquier sello vigente sirve para canjear
-- cualquier promoción activa del comercio, y el cliente elige cuál al momento del canje.
-- Como el sello ya no pertenece a una promoción, lo que hay que registrar es QUÉ promoción se
-- canjeó: esa es la columna nueva en Scan (solo se llena en REWARD_REDEEMED).
-- Stamp.promotionId se conserva por historial, pero el backend ya no lo usa para contar saldo.

ALTER TABLE "Scan" ADD COLUMN "promotionId" UUID;

ALTER TABLE "Scan" ADD CONSTRAINT "Scan_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Scan_promotionId_idx" ON "Scan"("promotionId");
