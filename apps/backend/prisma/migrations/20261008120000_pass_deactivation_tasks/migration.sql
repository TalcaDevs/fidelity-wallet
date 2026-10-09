CREATE TABLE "PassDeactivationTask" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "passId" UUID NOT NULL,
    "status" "PassUpdateStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassDeactivationTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PassDeactivationTask_status_nextRetryAt_idx" ON "PassDeactivationTask"("status", "nextRetryAt");
CREATE INDEX "PassDeactivationTask_passId_idx" ON "PassDeactivationTask"("passId");

ALTER TABLE "PassDeactivationTask" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT ALL ON TABLE "PassDeactivationTask" TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE "PassDeactivationTask" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE "PassDeactivationTask" FROM authenticated';
  END IF;
END $$;
