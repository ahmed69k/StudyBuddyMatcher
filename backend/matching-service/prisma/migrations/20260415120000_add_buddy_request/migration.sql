-- Idempotent: enum/table may already exist if a previous deploy failed mid-flight or the DB was reused.
DO $$ BEGIN
    CREATE TYPE "BuddyRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "BuddyRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "BuddyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuddyRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BuddyRequest_requesterId_idx" ON "BuddyRequest"("requesterId");
CREATE INDEX IF NOT EXISTS "BuddyRequest_receiverId_idx" ON "BuddyRequest"("receiverId");
CREATE INDEX IF NOT EXISTS "BuddyRequest_receiverId_status_idx" ON "BuddyRequest"("receiverId", "status");
CREATE INDEX IF NOT EXISTS "BuddyRequest_requesterId_status_idx" ON "BuddyRequest"("requesterId", "status");
