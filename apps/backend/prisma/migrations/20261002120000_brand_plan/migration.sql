-- Plan de cada marca, asignado a mano por el equipo interno hasta que exista cobro real
-- (HANDOFF §6.5). La prueba de las marcas existentes se cuenta desde su alta.

-- CreateEnum
CREATE TYPE "PlanId" AS ENUM ('TRIAL', 'STARTER', 'PRO', 'BUSINESS');

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "planId" "PlanId" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3) NOT NULL DEFAULT (now() + '30 days'::interval);


UPDATE "Brand" SET "trialEndsAt" = "createdAt" + interval '30 days';
