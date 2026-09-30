-- Tickets de soporte (HANDOFF §11.4). Solo los usa el backend: RLS sin políticas y sin grants
-- para anon ni authenticated, igual que PlatformAdmin y AuditLog.

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('SCANNER', 'WALLET', 'CUSTOMERS', 'PROMOTIONS', 'TEAM', 'LOCATIONS', 'BILLING', 'ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_ON_MERCHANT', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketAuthorType" AS ENUM ('MERCHANT', 'PLATFORM');

-- CreateTable
CREATE TABLE "Ticket" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" SERIAL NOT NULL,
    "brandId" UUID NOT NULL,
    "merchantId" UUID,
    "createdByUserId" UUID NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "description" TEXT NOT NULL,
    "contactPhone" TEXT,
    "assigneeUserId" UUID,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPublicReplyAt" TIMESTAMP(3),
    "merchantReadAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticketId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "authorType" "TicketAuthorType" NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAttachment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticketId" UUID NOT NULL,
    "messageId" UUID,
    "storagePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_number_key" ON "Ticket"("number");

-- CreateIndex
CREATE INDEX "Ticket_brandId_createdAt_idx" ON "Ticket"("brandId", "createdAt");

-- CreateIndex
CREATE INDEX "Ticket_status_lastMessageAt_idx" ON "Ticket"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Ticket_assigneeUserId_idx" ON "Ticket"("assigneeUserId");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TicketAttachment_storagePath_key" ON "TicketAttachment"("storagePath");

-- CreateIndex
CREATE INDEX "TicketAttachment_ticketId_idx" ON "TicketAttachment"("ticketId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TicketMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "Ticket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketAttachment" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public."Ticket", public."TicketMessage", public."TicketAttachment" FROM anon';
    EXECUTE 'REVOKE ALL ON SEQUENCE public."Ticket_number_seq" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON public."Ticket", public."TicketMessage", public."TicketAttachment" FROM authenticated';
    EXECUTE 'REVOKE ALL ON SEQUENCE public."Ticket_number_seq" FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT ALL ON public."Ticket", public."TicketMessage", public."TicketAttachment" TO service_role';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE public."Ticket_number_seq" TO service_role';
  END IF;
END
$$;

-- El correlativo parte en 1000 para que los números de ticket se lean como tales (#1000).
ALTER SEQUENCE "Ticket_number_seq" RESTART WITH 1000;
