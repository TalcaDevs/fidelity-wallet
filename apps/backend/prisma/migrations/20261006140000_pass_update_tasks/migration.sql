CREATE TYPE "PassUpdateStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "PassUpdateTask" (
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

    CONSTRAINT "PassUpdateTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PassUpdateTask_status_nextRetryAt_idx" ON "PassUpdateTask"("status", "nextRetryAt");
CREATE INDEX "PassUpdateTask_passId_idx" ON "PassUpdateTask"("passId");

ALTER TABLE "PassUpdateTask" ADD CONSTRAINT "PassUpdateTask_passId_fkey" FOREIGN KEY ("passId") REFERENCES "Pass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PassUpdateTask" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT ALL ON TABLE "PassUpdateTask" TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE "PassUpdateTask" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE "PassUpdateTask" FROM authenticated';
  END IF;
END $$;
