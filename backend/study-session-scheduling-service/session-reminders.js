import { publishNotification } from "./kafka/producer.js";

const addMinutes = (d, minutes) => new Date(d.getTime() + minutes * 60 * 1000);

/**
 * Polls for sessions starting within SESSION_REMINDER_LEAD_MINUTES (default 60)
 * and notifies all participants once (upcomingReminderSentAt).
 */
export function startSessionReminderScheduler(prisma) {
  const leadMin = Number(process.env.SESSION_REMINDER_LEAD_MINUTES || 60);
  const pollMs = Number(process.env.SESSION_REMINDER_POLL_MS || 300_000);

  const tick = async () => {
    const now = new Date();
    const horizon = addMinutes(now, leadMin);
    try {
      const sessions = await prisma.studySession.findMany({
        where: {
          upcomingReminderSentAt: null,
          dateTime: { gt: now, lte: horizon },
        },
        include: { participants: true },
      });

      for (const session of sessions) {
        const recipientIds = new Set([
          session.creatorId,
          ...session.participants.map((p) => p.userId),
        ]);
        const whenIso = session.dateTime.toISOString();

        for (const recipient of recipientIds) {
          await publishNotification({
            recipient,
            subject: "Upcoming study session",
            message: `Reminder: "${session.topic}" starts at ${whenIso}.`,
          });
        }

        await prisma.studySession.update({
          where: { id: session.id },
          data: { upcomingReminderSentAt: new Date() },
        });
      }

      if (sessions.length > 0) {
        console.log(
          `[session-reminders] notified participants for ${sessions.length} session(s) (≤${leadMin} min away)`
        );
      }
    } catch (err) {
      console.warn("[session-reminders] tick failed:", err?.message || err);
    }
  };

  void tick();
  const id = setInterval(() => void tick(), pollMs);
  return () => clearInterval(id);
}
