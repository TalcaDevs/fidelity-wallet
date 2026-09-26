-- Migración: customer_verification_code
-- Soporte para verificación de identidad de clientes y recuperación de pases perdidos vía OTP (SMS).
-- Permite re-emitir credenciales de billetera de forma segura sin riesgo de suplantación por RUT.

CREATE TABLE "CustomerVerificationCode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customerId" UUID NOT NULL,
    "merchantId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerVerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerVerificationCode_customerId_merchantId_createdAt_idx" 
    ON "CustomerVerificationCode"("customerId", "merchantId", "createdAt");

ALTER TABLE "CustomerVerificationCode" 
    ADD CONSTRAINT "CustomerVerificationCode_customerId_fkey" 
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerVerificationCode" 
    ADD CONSTRAINT "CustomerVerificationCode_merchantId_fkey" 
    FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
