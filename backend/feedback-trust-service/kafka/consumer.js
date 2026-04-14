import { Kafka } from "kafkajs";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "feedback-trust-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  retry: {
    retries: Number(process.env.KAFKA_RETRIES || 1),
    initialRetryTime: Number(process.env.KAFKA_RETRY_INITIAL_MS || 100),
  },
  ...(process.env.KAFKA_USERNAME && {
    sasl: {
      mechanism: "plain",
      username: process.env.KAFKA_USERNAME,
      password: process.env.KAFKA_PASSWORD,
    },
    ssl: true,
  }),
});

const groupId = process.env.KAFKA_GROUP_ID || "feedback-trust-group";
const consumer = kafka.consumer({ groupId });

const getEnvelope = (raw) => {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (parsed && typeof parsed === "object" && "event" in parsed && "payload" in parsed) {
    return parsed;
  }
  return null;
};

const ensureSnapshot = async (prisma, sessionId, defaults = {}) => {
  const existing = await prisma.sessionSnapshot.findUnique({
    where: { id: sessionId },
  });

  if (existing) return existing;

  return prisma.sessionSnapshot.create({
    data: {
      id: sessionId,
      topic: defaults.topic || "Unknown Session",
      dateTime: defaults.dateTime || new Date(),
      duration: defaults.duration || 60,
      creatorId: defaults.creatorId || "unknown",
      participantIds: defaults.participantIds || [],
      cancelled: defaults.cancelled ?? false,
    },
  });
};

export const startConsumer = async (prisma) => {
  try {
    await consumer.connect();
  } catch (err) {
    console.warn("⚠️ Kafka consumer not connected (feedback-trust-service):", err?.message || err);
    return;
  }

  try {
    await consumer.subscribe({ topic: "study-session-events", fromBeginning: true });
  } catch (err) {
    console.warn("⚠️ Kafka consumer subscribe failed (feedback-trust-service):", err?.message || err);
    return;
  }

  try {
    await consumer.run({
      eachMessage: async ({ message }) => {
        const raw = message.value?.toString();
        const env = getEnvelope(raw);
        if (!env) return;

        const payload = env.payload || {};
        const sessionId = payload.sessionId;
        if (!sessionId) return;

        if (env.event === "StudySessionCreated") {
          await prisma.sessionSnapshot.upsert({
            where: { id: sessionId },
            create: {
              id: sessionId,
              topic: payload.topic || "Unknown Session",
              dateTime: payload.dateTime ? new Date(payload.dateTime) : new Date(),
              duration: payload.duration || 60,
              creatorId: payload.creatorId || "unknown",
              participantIds: payload.creatorId ? [payload.creatorId] : [],
              cancelled: false,
            },
            update: {
              topic: payload.topic || "Unknown Session",
              dateTime: payload.dateTime ? new Date(payload.dateTime) : new Date(),
              duration: payload.duration || 60,
              creatorId: payload.creatorId || "unknown",
              participantIds: payload.creatorId ? [payload.creatorId] : [],
              cancelled: false,
            },
          });
          return;
        }

        if (env.event === "StudySessionUpdated") {
          await ensureSnapshot(prisma, sessionId, {
            topic: payload.topic,
            dateTime: payload.dateTime ? new Date(payload.dateTime) : undefined,
            duration: payload.duration,
            creatorId: payload.creatorId,
          });

          await prisma.sessionSnapshot.update({
            where: { id: sessionId },
            data: {
              ...(payload.topic ? { topic: payload.topic } : {}),
              ...(payload.dateTime ? { dateTime: new Date(payload.dateTime) } : {}),
              ...(payload.duration ? { duration: payload.duration } : {}),
              ...(payload.creatorId ? { creatorId: payload.creatorId } : {}),
            },
          });
          return;
        }

        if (env.event === "StudySessionJoined") {
          const snapshot = await ensureSnapshot(prisma, sessionId, {
            topic: payload.topic,
            creatorId: payload.creatorId,
            participantIds: payload.creatorId ? [payload.creatorId] : [],
          });

          const participantIds = Array.from(new Set([...(snapshot.participantIds || []), payload.userId].filter(Boolean)));
          await prisma.sessionSnapshot.update({
            where: { id: sessionId },
            data: { participantIds },
          });
          return;
        }

        if (env.event === "StudySessionLeft") {
          const snapshot = await ensureSnapshot(prisma, sessionId, {
            creatorId: payload.creatorId,
          });

          const participantIds = (snapshot.participantIds || []).filter((id) => id !== payload.userId);
          await prisma.sessionSnapshot.update({
            where: { id: sessionId },
            data: { participantIds },
          });
          return;
        }

        if (env.event === "StudySessionCancelled") {
          await ensureSnapshot(prisma, sessionId, {
            topic: payload.topic,
            creatorId: payload.creatorId,
          });

          await prisma.sessionSnapshot.update({
            where: { id: sessionId },
            data: { cancelled: true },
          });
        }
      },
    });
  } catch (err) {
    console.warn("⚠️ Kafka consumer run failed (feedback-trust-service):", err?.message || err);
    return;
  }

  console.log("Kafka consumer running (feedback-trust-service)...");
};
