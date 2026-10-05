-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('STAMPS', 'POINTS');

-- AlterTable
ALTER TABLE "LoyaltyProgram" ADD COLUMN     "allowMultipleRedemptionsPerVisit" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pointsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stampsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'STAMPS';

-- AlterTable
ALTER TABLE "Scan" ADD COLUMN     "pointsEarned" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Stamp" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'STAMPS';

