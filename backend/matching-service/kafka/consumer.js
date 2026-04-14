import { Kafka } from "kafkajs";
import "dotenv/config";

const kafka = new Kafka({
  clientId: "matching-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
  // ORIGINAL: retries: 1, initialRetryTime: 100 (via env defaults)
  // EDIT: HIGHER DEFAULT RETRIES WHEN KAFKA STARTS AFTER THIS SERVICE
  retry: {
    retries: Number(process.env.KAFKA_RETRIES || 8),
    initialRetryTime: Number(process.env.KAFKA_RETRY_INITIAL_MS || 300),
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

const groupId = process.env.KAFKA_GROUP_ID || "matching-group";
const consumer = kafka.consumer({ groupId });

const getEnvelope = (raw) => {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  // Support both enveloped and flat messages.
  if (parsed && typeof parsed === "object" && "event" in parsed && "payload" in parsed) return parsed;
  return { event: null, payload: parsed };
};

const availabilitySlotToString = (slot) => {
  const day = slot.dayOfWeek ?? slot.day ?? slot.weekday;
  const start = slot.startHour ?? slot.start ?? slot.from;
  const end = slot.endHour ?? slot.end ?? slot.to;
  if (day == null || start == null || end == null) return null;
  return `${day} ${start}-${end}`;
};

export const startConsumer = async (prisma) => {
  try {
    await consumer.connect();
  } catch (err) {
    console.warn("⚠️ Kafka consumer not connected (matching-service):", err?.message || err);
    return;
  }

  // Align with existing repo:
  // - profile service publishes UserPreferencesUpdated to topic "notifications" (enveloped)
  // - availability service publishes AvailabilityCreated/Updated/Deleted to topic "availability-updates" (enveloped)
  try {
    await consumer.subscribe({ topic: "notifications" });
    await consumer.subscribe({ topic: "availability-updates" });
  } catch (err) {
    console.warn("⚠️ Kafka consumer subscribe failed (matching-service):", err?.message || err);
    return;
  }

  try {
    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const raw = message.value?.toString();
        const env = getEnvelope(raw);
        if (!env) return;

        if (topic === "notifications" && env.event === "UserPreferencesUpdated") {
          const payload = env.payload || {};
          const pref = payload.studyPreference || {};

          const userId = payload.userId;
          if (!userId) return;

          await prisma.userProfile.upsert({
            where: { userId },
            create: {
              userId,
              name: payload.name || "Unknown",
              email: payload.email || null,
              courses: payload.courses || [],
              topics: payload.topics || [],
              studyPace: pref.pace ?? null,
              studyMode: pref.mode ?? null,
              preferredGroupSize: pref.groupSize ?? null,
              studyStyle: pref.studyStyle ?? null,
              availability: [],
            },
            update: {
              courses: payload.courses || [],
              topics: payload.topics || [],
              studyPace: pref.pace ?? null,
              studyMode: pref.mode ?? null,
              preferredGroupSize: pref.groupSize ?? null,
              studyStyle: pref.studyStyle ?? null,
            },
          });

          return;
        }

        if (topic === "availability-updates" && env.event) {
          const payload = env.payload || {};
          const userId = payload.userId;
          if (!userId) return;

          // Ensure profile exists (availability may arrive before profile updates)
          const existing = await prisma.userProfile.findUnique({ where: { userId } });
          if (!existing) {
            await prisma.userProfile.create({
              data: {
                userId,
                name: "Unknown",
                email: null,
                courses: [],
                topics: [],
                availability: [],
              },
            });
          }

          if (env.event === "AvailabilityDeleted") {
            const slotStr = availabilitySlotToString(payload);
            if (!slotStr) return;
            const current = await prisma.userProfile.findUnique({ where: { userId } });
            const next = (current?.availability || []).filter((s) => s !== slotStr);
            await prisma.userProfile.update({ where: { userId }, data: { availability: next } });
            return;
          }

          if (env.event === "AvailabilityCreated" || env.event === "AvailabilityUpdated") {
            const slotStr = availabilitySlotToString(payload);
            if (!slotStr) return;
            const current = await prisma.userProfile.findUnique({ where: { userId } });
            const set = new Set(current?.availability || []);
            set.add(slotStr);
            await prisma.userProfile.update({ where: { userId }, data: { availability: Array.from(set) } });
            return;
          }
        }
      },
    });
  } catch (err) {
    console.warn("⚠️ Kafka consumer run failed (matching-service):", err?.message || err);
    return;
  }

  console.log("Kafka consumer running (matching-service)...");
};

