-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('STAMPS', 'POINTS');

-- AlterTable
ALTER TABLE "LoyaltyProgram" ADD COLUMN     "allowMultipleRedemptionsPerVisit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pointsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stampsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'STAMPS';

-- AlterTable
ALTER TABLE "Scan" ADD COLUMN     "pointsEarned" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Stamp" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'STAMPS';

-- Backfill para LoyaltyProgram existentes
UPDATE "LoyaltyProgram"
SET "pointsEnabled" = true, "stampsEnabled" = false
WHERE "type" = 'POINTS';

-- Backfill para Promotion según el tipo de programa padre
UPDATE "Promotion" p
SET "currency" = 'POINTS'
FROM "LoyaltyProgram" lp
WHERE p."programId" = lp."id" AND lp."type" = 'POINTS';

-- Backfill para Stamp según el tipo de programa padre
UPDATE "Stamp" s
SET "currency" = 'POINTS'
FROM "LoyaltyProgram" lp
WHERE s."programId" = lp."id" AND lp."type" = 'POINTS';
