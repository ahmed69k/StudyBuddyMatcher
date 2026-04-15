-- AlterTable
ALTER TABLE "StudySession" ADD COLUMN "upcomingReminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "StudySession_dateTime_upcomingReminderSentAt_idx" ON "StudySession"("dateTime", "upcomingReminderSentAt");
