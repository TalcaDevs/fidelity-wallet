-- AlterTable
ALTER TABLE "Scan" ADD COLUMN "voidedAt" TIMESTAMP(3);
ALTER TABLE "Scan" ADD COLUMN "voidedByUserId" UUID;
ALTER TABLE "Scan" ADD COLUMN "voidReason" TEXT;

-- CreateIndex
CREATE INDEX "Scan_voidedAt_idx" ON "Scan"("voidedAt");
