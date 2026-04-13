-- CreateEnum
CREATE TYPE "BuddyRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "BuddyRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "BuddyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuddyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuddyRequest_requesterId_idx" ON "BuddyRequest"("requesterId");

-- CreateIndex
CREATE INDEX "BuddyRequest_receiverId_idx" ON "BuddyRequest"("receiverId");

-- CreateIndex
CREATE INDEX "BuddyRequest_receiverId_status_idx" ON "BuddyRequest"("receiverId", "status");

-- CreateIndex
CREATE INDEX "BuddyRequest_requesterId_status_idx" ON "BuddyRequest"("requesterId", "status");
