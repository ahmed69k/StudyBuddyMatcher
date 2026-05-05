import { publishNotification } from "./kafka/producer.js";

/** Shifts a `Date` forward by `minutes` — used to define the “starts within N minutes” reminder window. */
const addMinutes = (d, minutes) => new Date(d.getTime() + minutes * 60 * 1000);

/**
 * Background job: on a fixed interval, finds sessions starting soon that have not been reminded yet,
 * notifies creator + participants via Kafka, then sets `upcomingReminderSentAt` so each session is pinged once.
 */
export function startSessionReminderScheduler(prisma) {
  const leadMin = Number(process.env.SESSION_REMINDER_LEAD_MINUTES || 60);
  const pollMs = Number(process.env.SESSION_REMINDER_POLL_MS || 300_000);

  /** One polling cycle: query due sessions, fan-out notifications, mark rows as reminded. */
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
