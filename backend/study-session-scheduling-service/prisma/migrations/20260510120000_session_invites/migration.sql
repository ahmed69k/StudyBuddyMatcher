-- CreateTable
CREATE TABLE "StudySessionInvite" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "inviteeUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudySessionInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudySessionInvite_sessionId_inviteeUserId_key" ON "StudySessionInvite"("sessionId", "inviteeUserId");

-- CreateIndex
CREATE INDEX "StudySessionInvite_inviteeUserId_idx" ON "StudySessionInvite"("inviteeUserId");

-- AddForeignKey
ALTER TABLE "StudySessionInvite" ADD CONSTRAINT "StudySessionInvite_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
